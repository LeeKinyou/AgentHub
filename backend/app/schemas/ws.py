"""WebSocket message schemas matching shared/schemas/ws_messages.json contract.

Wire format uses camelCase; internal models use snake_case with aliases.
"""
from __future__ import annotations

from typing import Union
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


class TriggerActionPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    message_id: UUID
    action_type: str = Field(pattern=r"^(applyDiff|retry|pin)$")
    payload: dict | None = None


# ── C2S envelope models ────────────────────────────────────────────────


class WSSendMessage(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: str = "sendMessage"
    payload: SendMessagePayload


class WSTriggerAction(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: str = "triggerAction"
    payload: TriggerActionPayload


class WSPing(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: str = "ping"
    timestamp: str = ""


# ── Type union for validation dispatch ──────────────────────────────────

WSClientMessage = Union[WSSendMessage, WSTriggerAction, WSPing]

_C2S_TYPES: dict[str, type[BaseModel]] = {
    "sendMessage": WSSendMessage,
    "triggerAction": WSTriggerAction,
    "ping": WSPing,
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
