"""Tests for API key encryption in agent_config storage."""

import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, username: str = "keyuser") -> dict:
    resp = await client.post("/api/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "pass123456",
    })
    return resp.json()["data"]


@pytest.mark.asyncio
async def test_api_key_encrypted_in_db(client: AsyncClient, db_session):
    """When creating an agent with api_key, the database should store encrypted value."""
    data = await _register(client)
    uid = data["user"]["id"]
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    # Create agent with api_key
    resp = await client.post("/api/agents", json={
        "user_id": uid,
        "name": "key-agent",
        "role": "frontend",
        "adapter_type": "claude_code",
        "agent_config": {
            "api_key": "sk-ant-secret-key-12345",
            "api_provider": "anthropic",
        },
    }, headers=headers)
    assert resp.status_code == 200
    agent_id = resp.json()["data"]["id"]

    # Read from DB directly using the test session
    from app.models.agent_profile import AgentProfile
    agent = await db_session.get(AgentProfile, agent_id)
    raw_key = agent.agent_config.get("api_key", "")
    assert raw_key != "sk-ant-secret-key-12345", "API key should be encrypted in DB"
    assert raw_key.startswith("gAAAAA"), "Encrypted value should be Fernet token"


@pytest.mark.asyncio
async def test_api_key_masked_in_response(client: AsyncClient):
    """API response should mask the api_key (show only last 4 chars)."""
    data = await _register(client)
    uid = data["user"]["id"]
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    resp = await client.post("/api/agents", json={
        "user_id": uid,
        "name": "mask-agent",
        "role": "frontend",
        "adapter_type": "claude_code",
        "agent_config": {
            "api_key": "sk-ant-secret-key-12345",
        },
    }, headers=headers)
    assert resp.status_code == 200
    cfg = resp.json()["data"]["agent_config"]
    # Masking shows last 4 chars of the encrypted value (not original key)
    assert cfg["api_key"].startswith("****")
    assert cfg["api_key"] != "sk-ant-secret-key-12345"
    assert len(cfg["api_key"]) > 4  # Not just "****"


@pytest.mark.asyncio
async def test_decrypted_key_usable_for_llm(client: AsyncClient, db_session):
    """The decrypted key should be the original value (usable by adapters)."""
    from app.core.crypto import decrypt_field

    data = await _register(client)
    uid = data["user"]["id"]
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    resp = await client.post("/api/agents", json={
        "user_id": uid,
        "name": "decrypt-agent",
        "role": "frontend",
        "adapter_type": "claude_code",
        "agent_config": {"api_key": "my-real-api-key"},
    }, headers=headers)
    agent_id = resp.json()["data"]["id"]

    from app.models.agent_profile import AgentProfile
    agent = await db_session.get(AgentProfile, agent_id)
    decrypted = decrypt_field(agent.agent_config["api_key"])
    assert decrypted == "my-real-api-key"
