from typing import AsyncGenerator

from ..base_adapter import BaseAdapter, Message, MessageChunk


class CodexAdapter(BaseAdapter):
    """Codex adapter."""

    async def stream_chat(
        self,
        messages: list[Message],
        **kwargs,
    ) -> AsyncGenerator[MessageChunk, None]:
        # TODO: integrate Codex API
        yield MessageChunk(
            chunk_type="text",
            content="[CodexAdapter] stub response",
            is_final=True,
        )
