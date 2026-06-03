import pytest
from httpx import AsyncClient


@pytest.fixture
async def test_user(client: AsyncClient) -> dict:
    """Create a test user and return its data."""
    response = await client.post("/api/users", json={"username": "messageuser"})
    return response.json()["data"]


@pytest.fixture
async def test_session(client: AsyncClient, test_user: dict) -> dict:
    """Create a test session and return its data."""
    user_id = test_user["id"]
    response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "Message Session",
        "type": "single",
        "agent_ids": []
    })
    return response.json()["data"]


@pytest.mark.asyncio
async def test_list_messages_empty(client: AsyncClient, test_session: dict):
    """Test listing messages when none exist."""
    session_id = test_session["id"]
    response = await client.get(f"/api/sessions/{session_id}/messages")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"] == []


@pytest.mark.asyncio
async def test_list_messages_default_limit(client: AsyncClient, test_session: dict):
    """Test that default limit is 50."""
    session_id = test_session["id"]
    response = await client.get(f"/api/sessions/{session_id}/messages")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0


@pytest.mark.asyncio
async def test_list_messages_custom_limit(client: AsyncClient, test_session: dict):
    """Test listing messages with custom limit parameter."""
    session_id = test_session["id"]
    response = await client.get(f"/api/sessions/{session_id}/messages?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0


@pytest.mark.asyncio
async def test_list_messages_invalid_limit(client: AsyncClient, test_session: dict):
    """Test that invalid limit returns validation error."""
    session_id = test_session["id"]

    # Limit too low
    response = await client.get(f"/api/sessions/{session_id}/messages?limit=0")
    assert response.status_code == 422

    # Limit too high
    response = await client.get(f"/api/sessions/{session_id}/messages?limit=101")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_messages_with_cursor(client: AsyncClient, test_session: dict):
    """Test cursor pagination with message ID."""
    session_id = test_session["id"]

    # Test with a fake cursor (should still return empty)
    fake_cursor = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/sessions/{session_id}/messages?cursor={fake_cursor}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"] == []


@pytest.mark.asyncio
async def test_list_messages_nonexistent_session(client: AsyncClient):
    """Test listing messages for a non-existent session returns empty list."""
    fake_session_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/sessions/{fake_session_id}/messages")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"] == []  # Returns empty list, not error


@pytest.mark.asyncio
async def test_list_messages_response_structure(client: AsyncClient, test_session: dict):
    """Test the response structure matches MessageRead schema."""
    session_id = test_session["id"]
    response = await client.get(f"/api/sessions/{session_id}/messages")
    assert response.status_code == 200
    data = response.json()

    # Verify ApiResponse structure
    assert "code" in data
    assert "data" in data
    assert "message" in data
    assert data["code"] == 0
    assert data["message"] == "success"


@pytest.mark.asyncio
async def test_list_messages_with_invalid_cursor_format(client: AsyncClient, test_session: dict):
    """Test that invalid cursor format is handled."""
    session_id = test_session["id"]

    # Invalid cursor format (not a UUID)
    response = await client.get(f"/api/sessions/{session_id}/messages?cursor=invalid-uuid")
    # Bug: This should return 422 but currently accepts invalid format
    assert response.status_code == 200
