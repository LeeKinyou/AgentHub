from pydantic import BaseModel
from uuid import UUID


class AgentConfig(BaseModel):
    """Custom agent configuration."""
    api_provider: str = "anthropic"  # anthropic | openai
    api_key: str = ""  # User-provided API key
    base_url: str = ""  # Custom base URL for OpenAI-compatible APIs
    model: str = ""  # Custom model name
    system_prompt: str | None = None
    tools: list[dict] = []
    skills: list[str] = []
    mcp_servers: list[dict] = []


class AgentProfileBase(BaseModel):
    name: str
    avatar: str | None = None
    role: str  # orchestrator | expert
    adapter_type: str = "claude_code"  # claude_code | codex | opencode | custom
    description: str | None = None


class AgentProfileCreate(AgentProfileBase):
    user_id: UUID | None = None  # null = system agent
    system_prompt: str | None = None
    agent_config: AgentConfig | None = None


class AgentProfileUpdate(BaseModel):
    name: str | None = None
    avatar: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    agent_config: AgentConfig | None = None


class AgentProfileRead(AgentProfileBase):
    id: UUID
    user_id: UUID | None = None
    system_prompt: str | None = None
    agent_config: dict | None = None

    model_config = {"from_attributes": True}
