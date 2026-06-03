from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..dependencies import get_current_user
from ..models.message import Message
from ..models.session import Session
from ..models.user import User
from ..schemas.common import ApiResponse
from ..schemas.message import MessageRead

router = APIRouter(prefix="/sessions/{session_id}/messages", tags=["messages"])


@router.get("", response_model=ApiResponse[list[MessageRead]])
async def list_messages(
    session_id: UUID,
    cursor: str | None = Query(None, description="Message ID for cursor pagination"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session ownership
    session = await db.get(Session, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    stmt = select(Message).where(Message.session_id == session_id)

    if cursor:
        cursor_msg = await db.get(Message, cursor)
        if cursor_msg:
            stmt = stmt.where(
                or_(
                    Message.created_at < cursor_msg.created_at,
                    (Message.created_at == cursor_msg.created_at) & (Message.id < cursor_msg.id),
                )
            )

    stmt = stmt.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit)
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return ApiResponse(data=[MessageRead.model_validate(m) for m in messages])
