from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .enums import SessionType


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class SessionCreate(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    title: str = Field("新对话", max_length=255)
    type: SessionType = SessionType.SINGLE
    agent_ids: list[UUID] = Field(..., min_length=1)


class SessionUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    title: str | None = Field(None, max_length=255)
    is_pinned: bool | None = None
    is_archived: bool | None = None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=_to_camel, populate_by_name=True)

    id: UUID
    user_id: UUID
    title: str
    type: str
    agent_ids: list[UUID]
    is_pinned: bool = False
    is_archived: bool = False
    last_active_at: datetime | None = None
    last_message_preview: str | None = None
    created_at: datetime
    updated_at: datetime
