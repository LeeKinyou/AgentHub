import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_PREFIXES = [
    "image/",
    "text/",
    "application/json",
    "application/javascript",
    "application/typescript",
    "application/xml",
    "application/pdf",
]


class UploadResponse(BaseModel):
    url: str
    filename: str
    size: int
    mimeType: str


def is_mime_allowed(mime_type: str) -> bool:
    return any(mime_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES)


@router.post("", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    mime_type = file.content_type or "application/octet-stream"
    if not is_mime_allowed(mime_type):
        raise HTTPException(status_code=400, detail=f"File type not allowed: {mime_type}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    ext = Path(file.filename).suffix
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / stored_name
    file_path.write_bytes(content)

    return UploadResponse(
        url=f"/uploads/{stored_name}",
        filename=file.filename,
        size=len(content),
        mimeType=mime_type,
    )
