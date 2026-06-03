"""Authentication routes: register, login, refresh, logout, me."""

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
from ..core.database import get_db
from ..core.redis import get_redis_client
from ..dependencies import get_current_user, oauth2_scheme
from ..models.user import User
from ..schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from ..schemas.common import ApiResponse
from ..schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


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

    # Store refresh token in Redis
    redis = await get_redis_client()
    from ..core.config import get_settings
    settings = get_settings()
    await redis.setex(f"refresh:{user.id}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, refresh)

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

    redis = await get_redis_client()
    from ..core.config import get_settings
    settings = get_settings()
    await redis.setex(f"refresh:{user.id}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, refresh)

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
    redis = await get_redis_client()
    stored = await redis.get(f"refresh:{user_id}")
    if stored != body.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = encode_access_token(user.id, username=user.username)
    new_refresh = encode_refresh_token(user.id)

    from ..core.config import get_settings
    settings = get_settings()
    await redis.setex(f"refresh:{user.id}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, new_refresh)

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
    redis = await get_redis_client()
    # Blacklist the access token
    try:
        payload = decode_access_token(token)
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            import time
            ttl = max(int(exp - time.time()), 1)
            await redis.setex(f"bl:{jti}", ttl, "1")
    except Exception:
        pass
    # Remove refresh token
    await redis.delete(f"refresh:{current_user.id}")
    return ApiResponse(message="Logged out")


@router.get("/me", response_model=ApiResponse[UserRead])
async def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=UserRead.model_validate(current_user))
