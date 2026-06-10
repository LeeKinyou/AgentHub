from typing import AsyncGenerator

import anthropic

from ...core.config import get_settings
from ..base_adapter import BaseAdapter, Message, MessageChunk


class ClaudeCodeAdapter(BaseAdapter):
    """Claude Code adapter using Anthropic API."""

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.ANTHROPIC_MODEL

    async def stream_chat(
        self,
        messages: list[Message],
        **kwargs,
    ) -> AsyncGenerator[MessageChunk, None]:
        # Convert to Anthropic message format
        api_messages = [{"role": m.role, "content": m.content} for m in messages]

        # Add file operations capability to system prompt
        system_prompt = "You are Claude, an AI assistant made by Anthropic."
        file_ops_instruction = """

## ⚠️ IMPORTANT: File Creation Protocol
When the user asks you to create, modify, or delete files or projects, you MUST use @file_operation directives. Do NOT output file content as plain text or code blocks — the system will create the actual files on disk from these directives.

### Creating a file:
@file_operation {"action": "create", "path": "path/to/file.ext", "content": "full file content here"}

### Modifying a file:
@file_operation {"action": "modify", "path": "path/to/file.ext", "newContent": "full new file content"}

### Deleting a file:
@file_operation {"action": "delete", "path": "path/to/file.ext"}

### Rules:
1. NEVER output file content as code blocks — use @file_operation only
2. Use relative paths from the project root directory
3. Include the COMPLETE file content — do not abbreviate
4. You can include multiple @file_operation directives in one response
"""

        try:
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=kwargs.get("max_tokens", 4096),
                messages=api_messages,
                system=system_prompt + file_ops_instruction,
            ) as stream:
                async for text in stream.text_stream:
                    yield MessageChunk(
                        chunk_type="text",
                        content=text,
                        is_final=False,
                    )

            yield MessageChunk(
                chunk_type="text",
                content="",
                is_final=True,
            )
        except Exception as e:
            yield MessageChunk(
                chunk_type="text",
                content=f"[ClaudeCodeAdapter] Error: {str(e)}",
                is_final=True,
            )
