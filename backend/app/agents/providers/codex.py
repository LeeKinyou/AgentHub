"""Codex adapter using OpenAI-compatible API.

Codex is an OpenAI code model. This adapter uses the OpenAI async client
to communicate with the Codex API endpoint.
"""

import logging
from typing import AsyncGenerator

import openai

from ...core.config import get_settings
from ..base_adapter import BaseAdapter, Message, MessageChunk

logger = logging.getLogger(__name__)


class CodexAdapter(BaseAdapter):
    """Codex agent adapter using OpenAI-compatible API.

    Supports:
    - Streaming responses via OpenAI chat completions
    - Custom system prompt
    - agent_config overrides for api_key, model, base_url
    """

    def __init__(self, agent_config: dict | None = None):
        settings = get_settings()
        self.agent_config = agent_config or {}

        self.api_key = self.agent_config.get("api_key", "") or settings.OPENAI_API_KEY
        self.base_url = self.agent_config.get("base_url", "") or settings.OPENAI_BASE_URL
        self.model = self.agent_config.get("model", "") or "codex-002"

        self.client = openai.AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=120.0,
        )

    @property
    def system_prompt(self) -> str:
        base = self.agent_config.get("system_prompt") or "You are a helpful coding assistant powered by Codex."
        file_ops_instruction = """

## ⚠️ IMPORTANT: File Creation Protocol
When the user asks you to create, modify, or delete files or projects, you MUST use @file_operation directives. Do NOT output file content as plain text or code blocks — the system will create the actual files on disk from these directives.

### Creating a file:
@file_operation {"action": "create", "path": "path/to/file.ext", "content": "full file content here"}

### Modifying a file:
@file_operation {"action": "modify", "path": "path/to/file.ext", "newContent": "full new file content"}

### Deleting a file:
@file_operation {"action": "delete", "path": "path/to/file.ext"}

### Example — Creating a complete project:
我将为您创建一个网页时钟项目：

@file_operation {"action": "create", "path": "clock/index.html", "content": "<!DOCTYPE html>\n<html>...</html>"}

所有文件已创建完成。

### Rules:
1. NEVER output file content as code blocks — use @file_operation only
2. Use relative paths from the project root directory
3. Include the COMPLETE file content — do not abbreviate
4. You can include multiple @file_operation directives in one response
"""
        return base + file_ops_instruction

    async def stream_chat(
        self,
        messages: list[Message],
        **kwargs,
    ) -> AsyncGenerator[MessageChunk, None]:
        api_messages = [{"role": "system", "content": self.system_prompt}]
        api_messages += [{"role": m.role, "content": m.content} for m in messages]

        max_tokens = kwargs.get("max_tokens", 4096)

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                stream=True,
                max_tokens=max_tokens,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta is None or not delta.content:
                    continue
                yield MessageChunk(
                    chunk_type="text",
                    content=delta.content,
                    is_final=False,
                )

            yield MessageChunk(
                chunk_type="text",
                content="",
                is_final=True,
            )

        except Exception as e:
            logger.error("CodexAdapter error: %s", e)
            yield MessageChunk(
                chunk_type="text",
                content=f"[CodexAdapter] Error: {e}",
                is_final=True,
            )
