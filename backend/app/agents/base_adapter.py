from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncGenerator


@dataclass
class Message:
    role: str  # "user" | "assistant" | "system"
    content: str


@dataclass
class MessageChunk:
    chunk_type: str  # "text" | "code_diff" | "web_preview" | "deploy_status" | "tool_status"
    content: str
    is_final: bool
    agent_id: str = ""


@dataclass
class AgentStatusEvent:
    agent_id: str
    status: str  # "analyzing" | "executing" | "completed" | "failed"
    display_text: str


class BaseAdapter(ABC):
    """Agent unified adapter abstract base class.

    All external LLM calls must inherit this class and implement stream_chat.
    """

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[Message],
        **kwargs,
    ) -> AsyncGenerator[MessageChunk, None]:
        """Streaming chat interface.

        Args:
            messages: conversation history
            **kwargs: extra config (temperature, max_tokens, etc.)

        Yields:
            MessageChunk: streamed message chunks
        """
        ...

    async def validate_messages(self, messages: list[Message]) -> bool:
        return all(m.role in ("user", "assistant", "system") for m in messages)
