from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class DiffHunk(BaseModel):
    oldStart: int
    oldLines: int
    newStart: int
    newLines: int
    content: str


class CodeBlock(BaseModel):
    language: str
    code: str
    title: str


class DiffBlock(BaseModel):
    filename: str
    language: str
    additions: int
    deletions: int
    hunks: list[DiffHunk]
    status: str = "pending"  # pending | applied | rejected


class PreviewBlock(BaseModel):
    html: str
    css: str | None = None
    js: str | None = None
    viewport: str = "desktop"  # mobile | tablet | desktop


class DeployLogEntry(BaseModel):
    timestamp: str
    level: str  # info | warn | error
    message: str


class DeployBlock(BaseModel):
    status: str  # queued | building | deploying | live | failed
    progress: int = 0
    previewUrl: str | None = None
    logs: list[DeployLogEntry] = []


class CardData(BaseModel):
    codeBlock: CodeBlock | None = None
    diffBlock: DiffBlock | None = None
    previewBlock: PreviewBlock | None = None
    deployBlock: DeployBlock | None = None


class MessageRead(BaseModel):
    id: UUID
    session_id: UUID
    sender_type: str
    sender_id: str
    content: str
    content_type: str
    card_data: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str
    content_type: str = "text"
    card_data: dict | None = None
