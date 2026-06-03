"""Tests for routes/auth.py — register, login, refresh, logout endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """POST /api/auth/register should create a user and return tokens."""
    response = await client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "securepass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"
    assert data["data"]["user"]["username"] == "newuser"


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    """Registering with an existing username should fail."""
    await client.post("/api/auth/register", json={
        "username": "dupuser",
        "email": "dup1@example.com",
        "password": "pass123456",
    })
    response = await client.post("/api/auth/register", json={
        "username": "dupuser",
        "email": "dup2@example.com",
        "password": "pass123456",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """POST /api/auth/login with correct credentials should return tokens."""
    # Register first
    await client.post("/api/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "mypassword123",
    })

    # Login
    response = await client.post("/api/auth/login", json={
        "username": "loginuser",
        "password": "mypassword123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Login with wrong password should fail."""
    await client.post("/api/auth/register", json={
        "username": "wrongpass",
        "email": "wrong@example.com",
        "password": "correctpass",
    })

    response = await client.post("/api/auth/login", json={
        "username": "wrongpass",
        "password": "incorrectpass",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Login with non-existent username should fail."""
    response = await client.post("/api/auth/login", json={
        "username": "ghost",
        "password": "whatever",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 401


@pytest.mark.asyncio
async def test_me_without_token(client: AsyncClient):
    """GET /api/auth/me without token should return 401."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_with_valid_token(client: AsyncClient):
    """GET /api/auth/me with valid token should return user info."""
    # Register and get token
    reg = await client.post("/api/auth/register", json={
        "username": "meuser",
        "email": "me@example.com",
        "password": "pass123456",
    })
    token = reg.json()["data"]["access_token"]

    # Call /me
    response = await client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["username"] == "meuser"


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    """POST /api/auth/refresh with valid refresh token should return new access token."""
    reg = await client.post("/api/auth/register", json={
        "username": "refreshuser",
        "email": "refresh@example.com",
        "password": "pass123456",
    })
    refresh_token = reg.json()["data"]["refresh_token"]

    response = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]


@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    """POST /api/auth/logout should invalidate the token."""
    reg = await client.post("/api/auth/register", json={
        "username": "logoutuser",
        "email": "logout@example.com",
        "password": "pass123456",
    })
    token = reg.json()["data"]["access_token"]

    # Logout
    response = await client.post("/api/auth/logout", headers={
        "Authorization": f"Bearer {token}",
    })
    assert response.status_code == 200

    # Token should now be invalid
    me_response = await client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}",
    })
    assert me_response.status_code == 401
