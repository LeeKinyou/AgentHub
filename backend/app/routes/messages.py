from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..models.message import Message
from ..schemas.common import ApiResponse
from ..schemas.message import MessageRead

router = APIRouter(prefix="/sessions/{session_id}/messages", tags=["messages"])


@router.get("", response_model=ApiResponse[list[MessageRead]])
async def list_messages(
    session_id: UUID,
    cursor: str | None = Query(None, description="Message ID for cursor pagination"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Message).where(Message.session_id == session_id)

    if cursor:
        cursor_msg = await db.get(Message, cursor)
        if cursor_msg:
            stmt = stmt.where(Message.created_at < cursor_msg.created_at)

    stmt = stmt.order_by(Message.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return ApiResponse(data=[MessageRead.model_validate(m) for m in messages])
