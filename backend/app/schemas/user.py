from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class UserCreate(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    avatar: str | None = None


class UserUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    username: str | None = Field(None, min_length=2, max_length=50)
    email: EmailStr | None = None
    avatar: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=_to_camel, populate_by_name=True)

    id: UUID
    username: str
    email: str
    avatar: str | None = None
    created_at: datetime
    updated_at: datetime
