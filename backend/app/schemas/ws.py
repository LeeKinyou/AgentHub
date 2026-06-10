"""WebSocket message schemas matching shared/schemas/ws_messages.json contract.

Wire format uses camelCase; internal models use snake_case with aliases.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


# ── C2S (client-to-server) payload models ──────────────────────────────


class SendMessagePayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    session_id: UUID
    content: str = Field(min_length=1)
    reply_to_id: UUID | None = None
    mentioned_agents: list[UUID] | None = None


class TriggerActionPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    message_id: UUID
    action_type: str = Field(pattern=r"^(applyDiff|retry|pin)$")
    payload: dict | None = None


# ── C2S envelope models ────────────────────────────────────────────────


class WSSendMessage(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: str = "sendMessage"
    timestamp: str
    payload: SendMessagePayload


class WSTriggerAction(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: str = "triggerAction"
    timestamp: str
    payload: TriggerActionPayload


class WSPing(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: str = "ping"
    timestamp: str = ""


class StopGenerationPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    session_id: UUID


class WSStopGeneration(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: str = "stopGeneration"
    timestamp: str
    payload: StopGenerationPayload


# ── S2C (server-to-client) payload models ──────────────────────────────


class AgentStatusPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    session_id: str
    agent_id: str
    status: Literal["analyzing", "executing", "completed", "failed", "online", "offline", "busy", "error"]
    display_text: str


class MessageChunkPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    message_id: str
    session_id: str
    agent_id: str
    chunk_type: Literal["text", "code_diff", "web_preview", "deploy_status", "tool_status"]
    delta_content: str
    chunk_index: int = Field(ge=0)
    is_final: bool


class MessageCompletePayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    id: str
    session_id: str
    sender_type: str
    sender_id: str
    content: str
    content_type: str
    card_data: dict | None = None
    reply_to_id: str | None = None
    is_pinned: bool = False
    created_at: str


class ErrorPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    session_id: str
    error_code: str
    error_message: str
    recoverable: bool


class ActionStatusPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    session_id: str
    message_id: str
    action_type: Literal["applyDiff", "retry", "pin"]
    status: Literal["applying", "pending"]


class ActionResultPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    session_id: str
    message_id: str
    action_type: Literal["applyDiff", "retry", "pin"]
    status: Literal["applied", "rejected", "failed"]
    detail: str


# ── S2C envelope models ────────────────────────────────────────────────


class S2CPong(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["pong"] = "pong"
    timestamp: str


class S2CAgentStatus(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["agentStatus"] = "agentStatus"
    timestamp: str
    payload: AgentStatusPayload


class S2CMessageChunk(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["messageChunk"] = "messageChunk"
    timestamp: str
    payload: MessageChunkPayload


class S2CMessageComplete(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["messageComplete"] = "messageComplete"
    timestamp: str
    payload: MessageCompletePayload


class S2CError(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["error"] = "error"
    timestamp: str
    payload: ErrorPayload


class S2CActionStatus(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["actionStatus"] = "actionStatus"
    timestamp: str
    payload: ActionStatusPayload


class S2CActionResult(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["actionResult"] = "actionResult"
    timestamp: str
    payload: ActionResultPayload


S2CMessage = Union[S2CPong, S2CAgentStatus, S2CMessageChunk, S2CMessageComplete, S2CError, S2CActionStatus, S2CActionResult]


# ── Type union for validation dispatch ──────────────────────────────────

WSClientMessage = Union[WSSendMessage, WSTriggerAction, WSPing]

_C2S_TYPES: dict[str, type[BaseModel]] = {
    "sendMessage": WSSendMessage,
    "triggerAction": WSTriggerAction,
    "ping": WSPing,
    "stopGeneration": WSStopGeneration,
}


def validate_ws_message(data: dict) -> WSClientMessage | None:
    """Validate a raw WS dict against the C2S schema.

    Returns the parsed model on success, None on validation/type errors.
    """
    msg_type = data.get("type")
    schema = _C2S_TYPES.get(msg_type)
    if schema is None:
        return None
    try:
        return schema.model_validate(data)
    except Exception:
        return None
