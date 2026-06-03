import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    """Test creating a new user."""
    response = await client.post("/api/users", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "avatar": "https://example.com/avatar.png"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["message"] == "success"
    assert data["data"]["username"] == "testuser"
    assert data["data"]["email"] == "test@example.com"
    assert data["data"]["avatar"] == "https://example.com/avatar.png"
    assert "id" in data["data"]
    assert "created_at" in data["data"]


@pytest.mark.asyncio
async def test_create_user_minimal(client: AsyncClient):
    """Test creating a user with only required fields."""
    response = await client.post("/api/users", json={
        "username": "minimaluser",
        "email": "minimal@example.com",
        "password": "testpass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["username"] == "minimaluser"
    assert data["data"]["avatar"] is None


@pytest.mark.asyncio
async def test_list_users_empty(client: AsyncClient):
    """Test listing users when none exist."""
    response = await client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_list_users_with_data(client: AsyncClient):
    """Test listing users after creating some."""
    await client.post("/api/users", json={
        "username": "listuser1", "email": "l1@example.com", "password": "pass123456"
    })
    await client.post("/api/users", json={
        "username": "listuser2", "email": "l2@example.com", "password": "pass123456"
    })

    response = await client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert len(data["data"]) >= 2


@pytest.mark.asyncio
async def test_get_user(client: AsyncClient):
    """Test getting a specific user by ID."""
    create_response = await client.post("/api/users", json={
        "username": "getuser", "email": "get@example.com", "password": "pass123456"
    })
    user_id = create_response.json()["data"]["id"]

    response = await client.get(f"/api/users/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["username"] == "getuser"


@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    """Test getting a non-existent user returns 404 in code."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/users/{fake_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "User not found"


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient):
    """Test updating user information."""
    create_response = await client.post("/api/users", json={
        "username": "updateuser", "email": "upd@example.com", "password": "pass123456"
    })
    user_id = create_response.json()["data"]["id"]

    response = await client.patch(f"/api/users/{user_id}", json={
        "username": "updateduser",
        "email": "updated@example.com"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["username"] == "updateduser"
    assert data["data"]["email"] == "updated@example.com"


@pytest.mark.asyncio
async def test_update_user_partial(client: AsyncClient):
    """Test partial update of user (only some fields)."""
    create_response = await client.post("/api/users", json={
        "username": "partialuser", "email": "partial@example.com", "password": "pass123456"
    })
    user_id = create_response.json()["data"]["id"]

    response = await client.patch(f"/api/users/{user_id}", json={
        "avatar": "https://example.com/newavatar.png"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["username"] == "partialuser"  # unchanged
    assert data["data"]["email"] == "partial@example.com"  # unchanged
    assert data["data"]["avatar"] == "https://example.com/newavatar.png"  # updated


@pytest.mark.asyncio
async def test_update_user_not_found(client: AsyncClient):
    """Test updating a non-existent user returns 404 in code."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.patch(f"/api/users/{fake_id}", json={"username": "newname"})
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "User not found"


@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient):
    """Test deleting a user."""
    create_response = await client.post("/api/users", json={
        "username": "deleteuser", "email": "del@example.com", "password": "pass123456"
    })
    user_id = create_response.json()["data"]["id"]

    response = await client.delete(f"/api/users/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["message"] == "deleted"

    # Verify user is deleted
    get_response = await client.get(f"/api/users/{user_id}")
    assert get_response.json()["code"] == 404


@pytest.mark.asyncio
async def test_delete_user_not_found(client: AsyncClient):
    """Test deleting a non-existent user returns 404 in code."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.delete(f"/api/users/{fake_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "User not found"


@pytest.mark.asyncio
async def test_create_duplicate_username(client: AsyncClient):
    """Test creating a user with duplicate username should fail."""
    await client.post("/api/users", json={
        "username": "duplicate_user", "email": "dup1@example.com", "password": "pass123456"
    })
    response = await client.post("/api/users", json={
        "username": "duplicate_user", "email": "dup2@example.com", "password": "pass123456"
    })
    assert response.status_code == 200
    assert response.json()["code"] == 409


@pytest.mark.asyncio
async def test_create_duplicate_email(client: AsyncClient):
    """Test creating a user with duplicate email should fail."""
    await client.post("/api/users", json={
        "username": "emailuser1", "email": "same@example.com", "password": "pass123456"
    })
    response = await client.post("/api/users", json={
        "username": "emailuser2", "email": "same@example.com", "password": "pass123456"
    })
    assert response.status_code == 200
    assert response.json()["code"] == 409
