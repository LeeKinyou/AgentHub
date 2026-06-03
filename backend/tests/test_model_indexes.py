"""Tests for database indexes on frequently queried columns.

Bug #18: No indexes beyond primary keys. These tests verify that
indexes are defined on columns used in WHERE/ORDER BY clauses.
"""
from sqlalchemy import inspect


def test_session_has_user_id_index():
    """sessions.user_id should be indexed for list_sessions queries."""
    from app.models.session import Session

    table = Session.__table__
    index_columns = set()
    for idx in table.indexes:
        for col in idx.columns:
            index_columns.add(col.name)

    assert "user_id" in index_columns, (
        f"Missing index on sessions.user_id. Found indexes on: {index_columns}"
    )


def test_message_has_session_id_index():
    """messages.session_id should be indexed for list_messages queries."""
    from app.models.message import Message

    table = Message.__table__
    index_columns = set()
    for idx in table.indexes:
        for col in idx.columns:
            index_columns.add(col.name)

    assert "session_id" in index_columns, (
        f"Missing index on messages.session_id. Found indexes on: {index_columns}"
    )


def test_message_has_composite_index_for_cursor_pagination():
    """messages should have a composite (session_id, created_at) index for cursor pagination."""
    from app.models.message import Message

    table = Message.__table__
    composite_found = False
    for idx in table.indexes:
        col_names = [col.name for col in idx.columns]
        if col_names == ["session_id", "created_at"]:
            composite_found = True
            break

    assert composite_found, (
        f"Missing composite index (session_id, created_at). "
        f"Found: {[ [c.name for c in idx.columns] for idx in table.indexes ]}"
    )


def test_agent_profile_has_user_id_index():
    """agent_profiles.user_id should be indexed for list_agents queries."""
    from app.models.agent_profile import AgentProfile

    table = AgentProfile.__table__
    index_columns = set()
    for idx in table.indexes:
        for col in idx.columns:
            index_columns.add(col.name)

    assert "user_id" in index_columns, (
        f"Missing index on agent_profiles.user_id. Found indexes on: {index_columns}"
    )
