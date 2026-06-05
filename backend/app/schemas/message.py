from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class DiffHunk(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    old_start: int = Field(ge=0)  # 0 means new file creation
    old_lines: int = Field(ge=0)
    new_start: int = Field(ge=1)
    new_lines: int = Field(ge=0)
    content: str
    old_content: str | None = None  # Expected old content for verification


class CodeBlock(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    language: str
    code: str
    title: str


class DiffBlock(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    filename: str
    language: str
    additions: int = Field(ge=0)
    deletions: int = Field(ge=0)
    hunks: list[DiffHunk]
    status: Literal["pending", "applied", "rejected"] = "pending"


class PreviewBlock(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    html: str
    css: str | None = None
    js: str | None = None
    viewport: Literal["mobile", "tablet", "desktop"] = "desktop"


class DeployLogEntry(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    timestamp: str
    level: Literal["info", "warn", "error"]
    message: str


class DeployBlock(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    status: Literal["queued", "building", "deploying", "live", "failed"]
    progress: int = Field(default=0, ge=0, le=100)
    preview_url: str | None = None
    logs: list[DeployLogEntry] = []


class CardData(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    code_block: CodeBlock | None = None
    diff_block: DiffBlock | None = None
    preview_block: PreviewBlock | None = None
    deploy_block: DeployBlock | None = None


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=_to_camel, populate_by_name=True)

    id: UUID
    session_id: UUID
    sender_type: str
    sender_id: str
    content: str
    content_type: str
    card_data: dict | None = None
    created_at: datetime


class MessageCreate(BaseModel):
    content: str
    content_type: str = "text"
    card_data: dict | None = None
