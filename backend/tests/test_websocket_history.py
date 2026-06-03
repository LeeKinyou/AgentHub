"""Tests for multi-turn conversation context in WebSocket handler.

Bug #13: orchestrator.process() is called without conversation_history,
so every conversation is single-turn — agents can't remember prior context.

These tests verify the history-building logic without requiring a live database.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.base_adapter import Message


@pytest.mark.asyncio
async def test_build_conversation_history_returns_recent_messages():
    """conversation_history should contain recent messages from DB, ordered oldest-first."""
    from app.routes.websocket import build_conversation_history

    session_id = uuid.uuid4()

    # Mock DB session with scalars().all() returning messages
    mock_messages = []
    for i in range(5):
        m = MagicMock()
        m.sender_type = "user" if i % 2 == 0 else "agent"
        m.content = f"message {i}"
        mock_messages.append(m)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = list(reversed(mock_messages))  # DESC order from DB

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    history = await build_conversation_history(mock_db, session_id, limit=10)

    assert len(history) == 5
    # Should be re-sorted oldest-first
    # message 0 (even idx) → sender_type="user" → role="user"
    assert history[0] == Message(role="user", content="message 0")
    # message 4 (even idx) → sender_type="user" → role="user"
    assert history[-1] == Message(role="user", content="message 4")


@pytest.mark.asyncio
async def test_build_conversation_history_respects_limit():
    """Should pass limit through to the DB query."""
    from app.routes.websocket import build_conversation_history

    session_id = uuid.uuid4()

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    await build_conversation_history(mock_db, session_id, limit=5)

    # Verify the query was built with the limit
    call_args = mock_db.execute.call_args[0][0]
    # The compiled SQL should contain LIMIT 5
    compiled = str(call_args.compile(compile_kwargs={"literal_binds": True}))
    assert "5" in compiled


@pytest.mark.asyncio
async def test_build_conversation_history_empty_session():
    """Should return empty list for session with no messages."""
    from app.routes.websocket import build_conversation_history

    session_id = uuid.uuid4()

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    history = await build_conversation_history(mock_db, session_id, limit=10)

    assert history == []


@pytest.mark.asyncio
async def test_build_conversation_history_maps_roles_correctly():
    """user messages → role='user', agent messages → role='assistant'."""
    from app.routes.websocket import build_conversation_history

    session_id = uuid.uuid4()

    m1 = MagicMock()
    m1.sender_type = "user"
    m1.content = "hello"

    m2 = MagicMock()
    m2.sender_type = "agent"
    m2.content = "hi there"

    m3 = MagicMock()
    m3.sender_type = "user"
    m3.content = "how are you"

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [m3, m2, m1]  # DESC order

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    history = await build_conversation_history(mock_db, session_id, limit=10)

    assert len(history) == 3
    assert history[0] == Message(role="user", content="hello")
    assert history[1] == Message(role="assistant", content="hi there")
    assert history[2] == Message(role="user", content="how are you")


@pytest.mark.asyncio
async def test_build_conversation_history_filters_by_session():
    """Query should filter by session_id."""
    from app.routes.websocket import build_conversation_history

    session_id = uuid.uuid4()

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    await build_conversation_history(mock_db, session_id, limit=10)

    # Verify session_id is in the WHERE clause
    call_args = mock_db.execute.call_args[0][0]
    compiled = str(call_args.compile(compile_kwargs={"literal_binds": True}))
    # SQLAlchemy renders UUID without dashes in literal_binds mode
    assert str(session_id).replace("-", "") in compiled
