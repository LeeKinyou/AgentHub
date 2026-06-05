from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .enums import SessionType


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class SessionCreate(BaseModel):
    title: str = Field("新对话", max_length=255)
    type: SessionType = SessionType.SINGLE
    agent_ids: list[UUID] = Field(..., min_length=1)


class SessionUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=_to_camel, populate_by_name=True)

    id: UUID
    user_id: UUID
    title: str
    type: str
    agent_ids: list[UUID]
    created_at: datetime
    updated_at: datetime
