from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..dependencies import get_current_user
from ..models.session import Session
from ..models.session_agent import SessionAgent
from ..models.user import User
from ..schemas.common import ApiResponse
from ..schemas.session import SessionCreate, SessionRead, SessionUpdate

router = APIRouter(prefix="/users/{user_id}/sessions", tags=["sessions"])


async def _verify_owner(user_id: UUID, current_user: User) -> None:
    """Ensure the authenticated user owns this resource."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get("", response_model=ApiResponse[list[SessionRead]])
async def list_sessions(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_owner(user_id, current_user)
    result = await db.execute(
        select(Session).where(Session.user_id == user_id).order_by(Session.updated_at.desc())
    )
    sessions = result.scalars().all()
    return ApiResponse(data=[SessionRead.model_validate(s) for s in sessions])


@router.post("", response_model=ApiResponse[SessionRead])
async def create_session(
    user_id: UUID,
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_owner(user_id, current_user)
    session = Session(user_id=user_id, title=body.title, type=body.type, agent_ids=body.agent_ids)
    db.add(session)
    await db.flush()  # get session.id

    # Populate association table for proper FK constraints
    for agent_id in body.agent_ids:
        db.add(SessionAgent(session_id=session.id, agent_id=agent_id))

    await db.flush()
    await db.refresh(session)
    return ApiResponse(data=SessionRead.model_validate(session))


@router.get("/{session_id}", response_model=ApiResponse[SessionRead])
async def get_session(
    user_id: UUID,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_owner(user_id, current_user)
    session = await db.get(Session, session_id)
    if not session or session.user_id != user_id:
        return ApiResponse(code=404, message="Session not found")
    return ApiResponse(data=SessionRead.model_validate(session))


@router.patch("/{session_id}", response_model=ApiResponse[SessionRead])
async def update_session(
    user_id: UUID,
    session_id: UUID,
    body: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_owner(user_id, current_user)
    session = await db.get(Session, session_id)
    if not session or session.user_id != user_id:
        return ApiResponse(code=404, message="Session not found")
    if body.title is not None:
        session.title = body.title
    await db.flush()
    await db.refresh(session)
    return ApiResponse(data=SessionRead.model_validate(session))


@router.delete("/{session_id}", response_model=ApiResponse)
async def delete_session(
    user_id: UUID,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_owner(user_id, current_user)
    session = await db.get(Session, session_id)
    if not session or session.user_id != user_id:
        return ApiResponse(code=404, message="Session not found")
    await db.delete(session)
    return ApiResponse(message="deleted")
