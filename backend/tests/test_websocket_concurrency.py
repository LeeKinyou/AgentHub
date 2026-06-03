"""Tests for WebSocket concurrency control.

Bug #14: No concurrency control on sendMessage — multiple orchestrators
can run in parallel if the user sends messages rapidly.

These tests verify:
1. Only one sendMessage is processed at a time per connection
2. A second sendMessage during processing gets a 'busy' error
3. Rate limiting prevents rapid-fire message floods
"""
import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_send_message_rejected_while_processing():
    """Second sendMessage while first is still processing should get a BUSY error."""
    from app.routes.websocket import WebSocketSessionGuard

    guard = WebSocketSessionGuard()

    # Simulate: first message acquires the lock
    async with guard.message_lock():
        # While locked, a second attempt should fail immediately
        acquired = guard.message_lock_locked()
        assert acquired is True

        # Trying to acquire again should indicate busy
        can_process = guard.can_accept_message()
        assert can_process is False


@pytest.mark.asyncio
async def test_send_message_allowed_after_processing():
    """sendMessage should be allowed again after previous one finishes."""
    from app.routes.websocket import WebSocketSessionGuard

    guard = WebSocketSessionGuard()

    # Process one message
    async with guard.message_lock():
        pass

    # After lock released, next message should be accepted
    can_process = guard.can_accept_message()
    assert can_process is True


@pytest.mark.asyncio
async def test_rate_limiter_allows_normal_rate():
    """Messages within rate limit should be accepted."""
    from app.routes.websocket import WebSocketSessionGuard

    guard = WebSocketSessionGuard(min_interval_seconds=0.1)

    assert guard.check_rate_limit() is True
    guard.record_send_time()

    # After waiting, should be allowed
    await asyncio.sleep(0.15)
    assert guard.check_rate_limit() is True


@pytest.mark.asyncio
async def test_rate_limiter_rejects_rapid_messages():
    """Messages sent too rapidly should be rejected."""
    from app.routes.websocket import WebSocketSessionGuard

    guard = WebSocketSessionGuard(min_interval_seconds=1.0)

    assert guard.check_rate_limit() is True
    guard.record_send_time()

    # Immediately trying again should be rejected
    assert guard.check_rate_limit() is False
