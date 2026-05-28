from typing import AsyncGenerator

from ..base_adapter import BaseAdapter, Message, MessageChunk


class OpenCodeAdapter(BaseAdapter):
    """OpenCode adapter."""

    async def stream_chat(
        self,
        messages: list[Message],
        **kwargs,
    ) -> AsyncGenerator[MessageChunk, None]:
        # TODO: integrate OpenCode API
        yield MessageChunk(
            chunk_type="text",
            content="[OpenCodeAdapter] stub response",
            is_final=True,
        )
