from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    avatar: str | None = None


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=2, max_length=50)
    email: EmailStr | None = None
    avatar: str | None = None


class UserRead(BaseModel):
    id: UUID
    username: str
    email: str
    avatar: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
