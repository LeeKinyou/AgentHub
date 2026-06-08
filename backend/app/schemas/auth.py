"""Auth-related Pydantic schemas for register, login, token response."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .user import UserRead


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class RegisterRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    username: str
    password: str


class TokenResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    refresh_token: str
