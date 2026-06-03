"""Tests for route protection — all CRUD endpoints require authentication."""

import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, username: str = "authuser") -> dict:
    """Helper: register a user and return the token response data."""
    resp = await client.post("/api/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "pass123456",
    })
    return resp.json()["data"]


# ─── Sessions ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_sessions_requires_auth(client: AsyncClient):
    """GET /api/users/{id}/sessions without token should return 401."""
    uid = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/users/{uid}/sessions")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_sessions_with_auth(client: AsyncClient):
    """GET /api/users/{id}/sessions with valid token should succeed."""
    data = await _register(client)
    uid = data["user"]["id"]
    response = await client.get(f"/api/users/{uid}/sessions", headers={
        "Authorization": f"Bearer {data['access_token']}",
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_session_requires_auth(client: AsyncClient):
    """POST /api/users/{id}/sessions without token should return 401."""
    uid = "00000000-0000-0000-0000-000000000000"
    response = await client.post(f"/api/users/{uid}/sessions", json={
        "title": "test",
        "agent_ids": ["00000000-0000-0000-0000-000000000000"],
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_cannot_access_other_users_sessions(client: AsyncClient):
    """User A cannot list User B's sessions."""
    a = await _register(client, "userA")
    b = await _register(client, "userB")
    uid_b = b["user"]["id"]

    response = await client.get(f"/api/users/{uid_b}/sessions", headers={
        "Authorization": f"Bearer {a['access_token']}",
    })
    assert response.status_code == 403


# ─── Agents ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_agents_requires_auth(client: AsyncClient):
    """GET /api/agents without token should return 401."""
    response = await client.get("/api/agents")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_agent_requires_auth(client: AsyncClient):
    """POST /api/agents without token should return 401."""
    response = await client.post("/api/agents", json={
        "user_id": "00000000-0000-0000-0000-000000000000",
        "name": "test",
        "role": "frontend",
        "adapter_type": "claude_code",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_agent_with_auth(client: AsyncClient):
    """POST /api/agents with token should succeed."""
    data = await _register(client)
    uid = data["user"]["id"]
    response = await client.post("/api/agents", json={
        "user_id": uid,
        "name": "my-agent",
        "role": "frontend",
        "adapter_type": "claude_code",
    }, headers={
        "Authorization": f"Bearer {data['access_token']}",
    })
    assert response.status_code == 200
    assert response.json()["code"] == 0


@pytest.mark.asyncio
async def test_cannot_access_other_users_agents(client: AsyncClient):
    """User A cannot see User B's private agents (only system agents)."""
    a = await _register(client, "agentA")
    b = await _register(client, "agentB")
    uid_b = b["user"]["id"]

    # User A queries with User B's id — should only see system agents, not B's
    response = await client.get("/api/agents", params={"user_id": uid_b}, headers={
        "Authorization": f"Bearer {a['access_token']}",
    })
    assert response.status_code == 200
    # Should not contain any agent owned by B
    for agent in response.json()["data"]:
        assert agent.get("user_id") != uid_b


# ─── Messages ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_messages_requires_auth(client: AsyncClient):
    """GET /api/sessions/{id}/messages without token should return 401."""
    sid = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/sessions/{sid}/messages")
    assert response.status_code == 401
