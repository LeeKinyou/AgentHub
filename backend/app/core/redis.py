"""Async Redis client initialization and dependency injection."""

import logging

from .config import get_settings

logger = logging.getLogger(__name__)

_redis_client = None
_use_redis = False


async def get_redis_client():
    """Return the shared async Redis client (lazy init). Returns None if Redis is disabled."""
    global _redis_client, _use_redis
    
    settings = get_settings()
    if not settings.USE_REDIS:
        return None
    
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
            )
            _use_redis = True
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Running without Redis.")
            return None
    return _redis_client


async def close_redis():
    """Gracefully close the Redis connection pool."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception:
            pass
        _redis_client = None


def reset_redis():
    """Reset the Redis client reference (for testing)."""
    global _redis_client
    _redis_client = None
