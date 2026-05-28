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

        try:
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=kwargs.get("max_tokens", 4096),
                messages=api_messages,
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
