"""Tests for session_agents association table — proper many-to-many relationship."""

import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, username: str = "sauser") -> dict:
    resp = await client.post("/api/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "pass123456",
    })
    return resp.json()["data"]


@pytest.mark.asyncio
async def test_session_agents_table_exists(db_session):
    """session_agents table should exist in the database."""
    from sqlalchemy import text
    result = await db_session.execute(
        text("SELECT 1 FROM information_schema.tables WHERE table_name = 'session_agents'")
    )
    assert result.scalar() == 1


@pytest.mark.asyncio
async def test_create_session_with_agents(client: AsyncClient, db_session):
    """Creating a session with agent_ids should populate session_agents table."""
    data = await _register(client)
    uid = data["user"]["id"]
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    # Create an agent first
    agent_resp = await client.post("/api/agents", json={
        "user_id": uid,
        "name": "test-agent",
        "role": "frontend",
        "adapter_type": "claude_code",
    }, headers=headers)
    agent_id = agent_resp.json()["data"]["id"]

    # Create session with agent
    sess_resp = await client.post(f"/api/users/{uid}/sessions", json={
        "title": "test-session",
        "type": "single",
        "agent_ids": [agent_id],
    }, headers=headers)
    session_id = sess_resp.json()["data"]["id"]

    # Verify session_agents has the link
    from sqlalchemy import text
    result = await db_session.execute(
        text("SELECT agent_id FROM session_agents WHERE session_id = :sid"),
        {"sid": session_id},
    )
    rows = result.fetchall()
    assert len(rows) == 1
    assert str(rows[0][0]) == agent_id


@pytest.mark.asyncio
async def test_session_read_includes_agents(client: AsyncClient):
    """SessionRead response should include the agent list."""
    data = await _register(client)
    uid = data["user"]["id"]
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    agent_resp = await client.post("/api/agents", json={
        "user_id": uid,
        "name": "read-agent",
        "role": "backend",
        "adapter_type": "claude_code",
    }, headers=headers)
    agent_id = agent_resp.json()["data"]["id"]

    sess_resp = await client.post(f"/api/users/{uid}/sessions", json={
        "title": "read-session",
        "type": "single",
        "agent_ids": [agent_id],
    }, headers=headers)
    assert sess_resp.status_code == 200
    sess_data = sess_resp.json()["data"]
    assert "agents" in sess_data or "agent_ids" in sess_data
