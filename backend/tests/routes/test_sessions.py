import pytest
from httpx import AsyncClient


@pytest.fixture
async def test_user(client: AsyncClient) -> dict:
    """Create a test user and return its data."""
    response = await client.post("/api/users", json={"username": "sessionuser"})
    return response.json()["data"]


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient, test_user: dict):
    """Test creating a new session."""
    user_id = test_user["id"]
    response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "Test Session",
        "type": "single",
        "agent_ids": []
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["title"] == "Test Session"
    assert data["data"]["type"] == "single"
    assert data["data"]["user_id"] == user_id
    assert "id" in data["data"]
    assert "created_at" in data["data"]
    assert "updated_at" in data["data"]


@pytest.mark.asyncio
async def test_create_session_default_title(client: AsyncClient, test_user: dict):
    """Test creating a session with default title."""
    user_id = test_user["id"]
    response = await client.post(f"/api/users/{user_id}/sessions", json={
        "type": "single",
        "agent_ids": []
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["title"] == "新对话"


@pytest.mark.asyncio
async def test_list_sessions_empty(client: AsyncClient, test_user: dict):
    """Test listing sessions when none exist."""
    user_id = test_user["id"]
    response = await client.get(f"/api/users/{user_id}/sessions")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_list_sessions_with_data(client: AsyncClient, test_user: dict):
    """Test listing sessions after creating some."""
    user_id = test_user["id"]
    await client.post(f"/api/users/{user_id}/sessions", json={"title": "Session 1", "type": "single", "agent_ids": []})
    await client.post(f"/api/users/{user_id}/sessions", json={"title": "Session 2", "type": "group", "agent_ids": []})

    response = await client.get(f"/api/users/{user_id}/sessions")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) >= 2


@pytest.mark.asyncio
async def test_get_session(client: AsyncClient, test_user: dict):
    """Test getting a specific session by ID."""
    user_id = test_user["id"]
    create_response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "Get Session",
        "type": "single",
        "agent_ids": []
    })
    session_id = create_response.json()["data"]["id"]

    response = await client.get(f"/api/users/{user_id}/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["title"] == "Get Session"


@pytest.mark.asyncio
async def test_get_session_not_found(client: AsyncClient, test_user: dict):
    """Test getting a non-existent session returns 404 in code."""
    user_id = test_user["id"]
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/users/{user_id}/sessions/{fake_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Session not found"


@pytest.mark.asyncio
async def test_get_session_wrong_user(client: AsyncClient, test_user: dict):
    """Test getting a session belonging to another user returns 404 in code."""
    user_id = test_user["id"]
    create_response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "User's Session",
        "type": "single",
        "agent_ids": []
    })
    session_id = create_response.json()["data"]["id"]

    # Try to get with a different user_id
    fake_user_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/users/{fake_user_id}/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Session not found"


@pytest.mark.asyncio
async def test_update_session(client: AsyncClient, test_user: dict):
    """Test updating session title."""
    user_id = test_user["id"]
    create_response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "Original Title",
        "type": "single",
        "agent_ids": []
    })
    session_id = create_response.json()["data"]["id"]

    response = await client.patch(f"/api/users/{user_id}/sessions/{session_id}", json={
        "title": "Updated Title"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_update_session_not_found(client: AsyncClient, test_user: dict):
    """Test updating a non-existent session returns 404 in code."""
    user_id = test_user["id"]
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.patch(f"/api/users/{user_id}/sessions/{fake_id}", json={
        "title": "New Title"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Session not found"


@pytest.mark.asyncio
async def test_update_session_wrong_user(client: AsyncClient, test_user: dict):
    """Test updating a session belonging to another user returns 404 in code."""
    user_id = test_user["id"]
    create_response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "User's Session",
        "type": "single",
        "agent_ids": []
    })
    session_id = create_response.json()["data"]["id"]

    # Try to update with a different user_id
    fake_user_id = "00000000-0000-0000-0000-000000000000"
    response = await client.patch(f"/api/users/{fake_user_id}/sessions/{session_id}", json={
        "title": "Hacked Title"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Session not found"


@pytest.mark.asyncio
async def test_delete_session(client: AsyncClient, test_user: dict):
    """Test deleting a session."""
    user_id = test_user["id"]
    create_response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "Delete Session",
        "type": "single",
        "agent_ids": []
    })
    session_id = create_response.json()["data"]["id"]

    response = await client.delete(f"/api/users/{user_id}/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["message"] == "deleted"

    # Verify session is deleted
    get_response = await client.get(f"/api/users/{user_id}/sessions/{session_id}")
    assert get_response.json()["code"] == 404


@pytest.mark.asyncio
async def test_delete_session_not_found(client: AsyncClient, test_user: dict):
    """Test deleting a non-existent session returns 404 in code."""
    user_id = test_user["id"]
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.delete(f"/api/users/{user_id}/sessions/{fake_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Session not found"


@pytest.mark.asyncio
async def test_delete_session_wrong_user(client: AsyncClient, test_user: dict):
    """Test deleting a session belonging to another user returns 404 in code."""
    user_id = test_user["id"]
    create_response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "User's Session",
        "type": "single",
        "agent_ids": []
    })
    session_id = create_response.json()["data"]["id"]

    # Try to delete with a different user_id
    fake_user_id = "00000000-0000-0000-0000-000000000000"
    response = await client.delete(f"/api/users/{fake_user_id}/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Session not found"


@pytest.mark.asyncio
async def test_create_session_with_agent_ids(client: AsyncClient, test_user: dict):
    """Test creating a session with agent IDs."""
    user_id = test_user["id"]
    agent_ids = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]
    response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "Session with Agents",
        "type": "group",
        "agent_ids": agent_ids
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["agent_ids"]) == 2


@pytest.mark.asyncio
async def test_create_session_nonexistent_user(client: AsyncClient):
    """Test creating a session for a non-existent user (should succeed due to no FK check)."""
    fake_user_id = "00000000-0000-0000-0000-000000000000"
    response = await client.post(f"/api/users/{fake_user_id}/sessions", json={
        "title": "Orphan Session",
        "type": "single",
        "agent_ids": []
    })
    # Bug: This succeeds but shouldn't - no FK validation
    assert response.status_code == 200
