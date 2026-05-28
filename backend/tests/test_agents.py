import pytest
from httpx import AsyncClient


@pytest.fixture
async def test_user(client: AsyncClient) -> dict:
    """Create a test user and return its data."""
    response = await client.post("/api/users", json={"username": "agentuser"})
    return response.json()["data"]


@pytest.mark.asyncio
async def test_create_agent(client: AsyncClient, test_user: dict):
    """Test creating a new agent profile."""
    user_id = test_user["id"]
    response = await client.post("/api/agents", json={
        "name": "Test Agent",
        "role": "expert",
        "adapter_type": "custom",
        "description": "A test agent",
        "system_prompt": "You are a test agent",
        "user_id": user_id,
        "agent_config": {
            "api_provider": "openai",
            "model": "gpt-4",
            "base_url": "http://localhost:1234/v1"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["name"] == "Test Agent"
    assert data["data"]["role"] == "expert"
    assert data["data"]["adapter_type"] == "custom"
    assert data["data"]["description"] == "A test agent"
    assert data["data"]["system_prompt"] == "You are a test agent"
    assert data["data"]["user_id"] == user_id
    assert "id" in data["data"]
    assert "created_at" in data["data"]


@pytest.mark.asyncio
async def test_create_system_agent(client: AsyncClient):
    """Test creating a system agent (no user_id)."""
    response = await client.post("/api/agents", json={
        "name": "System Agent",
        "role": "orchestrator",
        "adapter_type": "claude_code"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["name"] == "System Agent"
    assert data["data"]["user_id"] is None


@pytest.mark.asyncio
async def test_create_agent_minimal(client: AsyncClient):
    """Test creating an agent with only required fields."""
    response = await client.post("/api/agents", json={
        "name": "Minimal Agent",
        "role": "expert"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["adapter_type"] == "claude_code"  # default
    assert data["data"]["description"] is None


@pytest.mark.asyncio
async def test_list_agents_empty(client: AsyncClient):
    """Test listing agents when none exist."""
    response = await client.get("/api/agents")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_list_agents_with_data(client: AsyncClient):
    """Test listing agents after creating some."""
    await client.post("/api/agents", json={"name": "Agent 1", "role": "expert"})
    await client.post("/api/agents", json={"name": "Agent 2", "role": "orchestrator"})

    response = await client.get("/api/agents")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) >= 2


@pytest.mark.asyncio
async def test_list_agents_filter_by_user(client: AsyncClient, test_user: dict):
    """Test listing agents filtered by user_id returns system + user agents."""
    user_id = test_user["id"]

    # Create system agent
    await client.post("/api/agents", json={"name": "System Agent", "role": "expert"})
    # Create user agent
    await client.post("/api/agents", json={"name": "User Agent", "role": "expert", "user_id": user_id})

    # List all agents (no filter)
    response = await client.get("/api/agents")
    all_agents = response.json()["data"]

    # List agents filtered by user_id
    response = await client.get(f"/api/agents?user_id={user_id}")
    assert response.status_code == 200
    data = response.json()
    # Should include system agents + user's own agents
    assert len(data["data"]) >= 2


@pytest.mark.asyncio
async def test_list_agents_filter_by_user_excludes_others(client: AsyncClient, test_user: dict):
    """Test that filtering by user_id excludes other users' agents."""
    user_id = test_user["id"]

    # Create another user and their agent
    other_user_response = await client.post("/api/users", json={"username": "otheragentuser"})
    other_user_id = other_user_response.json()["data"]["id"]
    await client.post("/api/agents", json={"name": "Other User Agent", "role": "expert", "user_id": other_user_id})

    # Create current user's agent
    await client.post("/api/agents", json={"name": "My Agent", "role": "expert", "user_id": user_id})

    # Filter by current user
    response = await client.get(f"/api/agents?user_id={user_id}")
    data = response.json()
    agent_names = [a["name"] for a in data["data"]]
    assert "My Agent" in agent_names
    assert "Other User Agent" not in agent_names


@pytest.mark.asyncio
async def test_get_agent(client: AsyncClient):
    """Test getting a specific agent by ID."""
    create_response = await client.post("/api/agents", json={
        "name": "Get Agent",
        "role": "expert"
    })
    agent_id = create_response.json()["data"]["id"]

    response = await client.get(f"/api/agents/{agent_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["name"] == "Get Agent"


@pytest.mark.asyncio
async def test_get_agent_not_found(client: AsyncClient):
    """Test getting a non-existent agent returns 404 in code."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/agents/{fake_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Agent not found"


@pytest.mark.asyncio
async def test_update_agent(client: AsyncClient):
    """Test updating agent information."""
    create_response = await client.post("/api/agents", json={
        "name": "Original Agent",
        "role": "expert",
        "description": "Original description"
    })
    agent_id = create_response.json()["data"]["id"]

    response = await client.patch(f"/api/agents/{agent_id}", json={
        "name": "Updated Agent",
        "description": "Updated description"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["name"] == "Updated Agent"
    assert data["data"]["description"] == "Updated description"


@pytest.mark.asyncio
async def test_update_agent_partial(client: AsyncClient):
    """Test partial update of agent."""
    create_response = await client.post("/api/agents", json={
        "name": "Partial Agent",
        "role": "expert",
        "description": "Original description",
        "system_prompt": "Original prompt"
    })
    agent_id = create_response.json()["data"]["id"]

    # Update only system_prompt
    response = await client.patch(f"/api/agents/{agent_id}", json={
        "system_prompt": "New prompt"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "Partial Agent"  # unchanged
    assert data["data"]["description"] == "Original description"  # unchanged
    assert data["data"]["system_prompt"] == "New prompt"  # updated


@pytest.mark.asyncio
async def test_update_agent_config(client: AsyncClient):
    """Test updating agent configuration."""
    create_response = await client.post("/api/agents", json={
        "name": "Config Agent",
        "role": "expert"
    })
    agent_id = create_response.json()["data"]["id"]

    response = await client.patch(f"/api/agents/{agent_id}", json={
        "agent_config": {
            "api_provider": "openai",
            "model": "gpt-4",
            "base_url": "http://localhost:8080/v1"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["agent_config"]["api_provider"] == "openai"
    assert data["data"]["agent_config"]["model"] == "gpt-4"


@pytest.mark.asyncio
async def test_update_agent_not_found(client: AsyncClient):
    """Test updating a non-existent agent returns 404 in code."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.patch(f"/api/agents/{fake_id}", json={"name": "New Name"})
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Agent not found"


@pytest.mark.asyncio
async def test_delete_agent(client: AsyncClient):
    """Test deleting an agent."""
    create_response = await client.post("/api/agents", json={
        "name": "Delete Agent",
        "role": "expert"
    })
    agent_id = create_response.json()["data"]["id"]

    response = await client.delete(f"/api/agents/{agent_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["message"] == "deleted"

    # Verify agent is deleted
    get_response = await client.get(f"/api/agents/{agent_id}")
    assert get_response.json()["code"] == 404


@pytest.mark.asyncio
async def test_delete_agent_not_found(client: AsyncClient):
    """Test deleting a non-existent agent returns 404 in code."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.delete(f"/api/agents/{fake_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 404
    assert data["message"] == "Agent not found"


@pytest.mark.asyncio
async def test_create_agent_with_full_config(client: AsyncClient):
    """Test creating an agent with full configuration including tools and skills."""
    response = await client.post("/api/agents", json={
        "name": "Full Config Agent",
        "role": "expert",
        "adapter_type": "custom",
        "agent_config": {
            "api_provider": "openai",
            "api_key": "test-key",
            "base_url": "http://localhost:1234/v1",
            "model": "qwen3.5-9b",
            "system_prompt": "You are a coding assistant",
            "tools": [{"type": "function", "function": {"name": "test_tool"}}],
            "skills": ["coding", "debugging"],
            "mcp_servers": [{"name": "test_server", "url": "http://localhost:3000"}]
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    config = data["data"]["agent_config"]
    assert config["api_provider"] == "openai"
    assert config["model"] == "qwen3.5-9b"
    assert len(config["tools"]) == 1
    assert len(config["skills"]) == 2
    assert len(config["mcp_servers"]) == 1


@pytest.mark.asyncio
async def test_delete_agent_referenced_by_session(client: AsyncClient, test_user: dict):
    """Test deleting an agent that is referenced by a session (Bug: no cascade check)."""
    user_id = test_user["id"]

    # Create an agent
    agent_response = await client.post("/api/agents", json={
        "name": "Referenced Agent",
        "role": "expert"
    })
    agent_id = agent_response.json()["data"]["id"]

    # Create a session referencing this agent
    session_response = await client.post(f"/api/users/{user_id}/sessions", json={
        "title": "Session with Agent",
        "type": "single",
        "agent_ids": [agent_id]
    })
    assert session_response.status_code == 200

    # Delete the agent (Bug: should fail or warn, but succeeds)
    delete_response = await client.delete(f"/api/agents/{agent_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["code"] == 0

    # The session now references a non-existent agent
    session_id = session_response.json()["data"]["id"]
    get_session = await client.get(f"/api/users/{user_id}/sessions/{session_id}")
    assert get_session.status_code == 200
    # Bug: session still has the deleted agent's ID
    assert agent_id in get_session.json()["data"]["agent_ids"]
