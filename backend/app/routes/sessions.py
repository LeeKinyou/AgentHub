from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..models.session import Session
from ..schemas.common import ApiResponse
from ..schemas.session import SessionCreate, SessionRead, SessionUpdate

router = APIRouter(prefix="/users/{user_id}/sessions", tags=["sessions"])


@router.get("", response_model=ApiResponse[list[SessionRead]])
async def list_sessions(user_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(Session.user_id == user_id).order_by(Session.updated_at.desc())
    )
    sessions = result.scalars().all()
    return ApiResponse(data=[SessionRead.model_validate(s) for s in sessions])


@router.post("", response_model=ApiResponse[SessionRead])
async def create_session(user_id: UUID, body: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = Session(user_id=user_id, title=body.title, type=body.type, agent_ids=body.agent_ids)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return ApiResponse(data=SessionRead.model_validate(session))


@router.get("/{session_id}", response_model=ApiResponse[SessionRead])
async def get_session(user_id: UUID, session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.user_id != user_id:
        return ApiResponse(code=404, message="Session not found")
    return ApiResponse(data=SessionRead.model_validate(session))


@router.patch("/{session_id}", response_model=ApiResponse[SessionRead])
async def update_session(user_id: UUID, session_id: UUID, body: SessionUpdate, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.user_id != user_id:
        return ApiResponse(code=404, message="Session not found")
    if body.title is not None:
        session.title = body.title
    await db.flush()
    await db.refresh(session)
    return ApiResponse(data=SessionRead.model_validate(session))


@router.delete("/{session_id}", response_model=ApiResponse)
async def delete_session(user_id: UUID, session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.user_id != user_id:
        return ApiResponse(code=404, message="Session not found")
    await db.delete(session)
    return ApiResponse(message="deleted")
