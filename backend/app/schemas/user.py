from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: str | None = None
    avatar: str | None = None


class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    avatar: str | None = None


class UserRead(BaseModel):
    id: UUID
    username: str
    email: str | None = None
    avatar: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
