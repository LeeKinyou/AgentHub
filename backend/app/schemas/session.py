from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class SessionCreate(BaseModel):
    title: str = "新对话"
    type: str  # single | group
    agent_ids: list[UUID]


class SessionUpdate(BaseModel):
    title: str | None = None


class SessionRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    type: str
    agent_ids: list[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
