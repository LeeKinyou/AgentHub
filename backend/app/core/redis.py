"""Async Redis client initialization and dependency injection."""

import redis.asyncio as aioredis

from .config import get_settings

_redis_client: aioredis.Redis | None = None


async def get_redis_client() -> aioredis.Redis:
    """Return the shared async Redis client (lazy init)."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_client


async def close_redis():
    """Gracefully close the Redis connection pool."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


def reset_redis():
    """Reset the Redis client reference (for testing)."""
    global _redis_client
    _redis_client = None
