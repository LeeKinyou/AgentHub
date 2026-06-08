"""Authentication routes: register, login, refresh, logout, me."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.auth import (
    decode_access_token,
    encode_access_token,
    encode_refresh_token,
    hash_password,
    verify_password,
)
from ..core.config import get_settings
from ..core.database import get_db
from ..core.redis import get_redis_client
from ..dependencies import get_current_user, oauth2_scheme
from ..models.user import User
from ..schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from ..schemas.common import ApiResponse
from ..schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


async def _store_refresh_token(user_id, refresh: str):
    """Store refresh token in Redis if available, otherwise skip."""
    redis = await get_redis_client()
    if redis:
        settings = get_settings()
        await redis.setex(f"refresh:{user_id}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, refresh)


async def _verify_refresh_token(user_id: str, refresh_token: str) -> bool:
    """Verify refresh token. If Redis is available, check against stored token."""
    redis = await get_redis_client()
    if redis:
        stored = await redis.get(f"refresh:{user_id}")
        return stored == refresh_token
    # Without Redis, just verify the token is valid JWT
    try:
        payload = decode_access_token(refresh_token)
        return payload.get("sub") == user_id and payload.get("type") == "refresh"
    except Exception:
        return False


async def _blacklist_token(token: str, user_id):
    """Blacklist token in Redis if available."""
    redis = await get_redis_client()
    if redis:
        try:
            payload = decode_access_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                ttl = max(int(exp - datetime.now(timezone.utc).timestamp()), 1)
                await redis.setex(f"bl:{jti}", ttl, "1")
        except Exception:
            pass
        await redis.delete(f"refresh:{user_id}")


@router.post("/register", response_model=ApiResponse[TokenResponse])
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return ApiResponse(code=409, message="Username or email already exists")
    await db.refresh(user)

    access = encode_access_token(user.id, username=user.username)
    refresh = encode_refresh_token(user.id)

    await _store_refresh_token(user.id, refresh)

    return ApiResponse(data=TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserRead.model_validate(user),
    ))


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        return ApiResponse(code=401, message="Invalid username or password")

    access = encode_access_token(user.id, username=user.username)
    refresh = encode_refresh_token(user.id)

    await _store_refresh_token(user.id, refresh)

    return ApiResponse(data=TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserRead.model_validate(user),
    ))


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_access_token(body.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    user_id = payload["sub"]

    if not await _verify_refresh_token(user_id, body.refresh_token):
        raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = encode_access_token(user.id, username=user.username)
    new_refresh = encode_refresh_token(user.id)

    await _store_refresh_token(user.id, new_refresh)

    return ApiResponse(data=TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user=UserRead.model_validate(user),
    ))


@router.post("/logout", response_model=ApiResponse)
async def logout(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    await _blacklist_token(token, current_user.id)
    return ApiResponse(message="Logged out")


@router.get("/me", response_model=ApiResponse[UserRead])
async def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=UserRead.model_validate(current_user))
