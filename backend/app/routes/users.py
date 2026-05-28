from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..models.user import User
from ..schemas.common import ApiResponse
from ..schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=ApiResponse[list[UserRead]])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return ApiResponse(data=[UserRead.model_validate(u) for u in users])


@router.post("", response_model=ApiResponse[UserRead])
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    user = User(username=body.username, email=body.email, avatar=body.avatar)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return ApiResponse(data=UserRead.model_validate(user))


@router.get("/{user_id}", response_model=ApiResponse[UserRead])
async def get_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        return ApiResponse(code=404, message="User not found")
    return ApiResponse(data=UserRead.model_validate(user))


@router.patch("/{user_id}", response_model=ApiResponse[UserRead])
async def update_user(user_id: UUID, body: UserUpdate, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        return ApiResponse(code=404, message="User not found")
    if body.username is not None:
        user.username = body.username
    if body.email is not None:
        user.email = body.email
    if body.avatar is not None:
        user.avatar = body.avatar
    await db.flush()
    await db.refresh(user)
    return ApiResponse(data=UserRead.model_validate(user))


@router.delete("/{user_id}", response_model=ApiResponse)
async def delete_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        return ApiResponse(code=404, message="User not found")
    await db.delete(user)
    return ApiResponse(message="deleted")
