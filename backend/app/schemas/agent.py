from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_serializer

from .enums import AdapterType, AgentRole, AgentStatus


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class AgentConfig(BaseModel):
    """Custom agent configuration."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    api_provider: str = "anthropic"  # anthropic | openai
    api_key: str = ""  # User-provided API key
    base_url: str = ""  # Custom base URL for OpenAI-compatible APIs
    model: str = ""  # Custom model name
    system_prompt: str | None = None
    tools: list[dict] = []
    skills: list[str] = []
    mcp_servers: list[dict] = []


class AgentProfileBase(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=100)
    avatar: str | None = None
    role: AgentRole
    adapter_type: AdapterType = AdapterType.CLAUDE_CODE
    description: str | None = None


class AgentProfileCreate(AgentProfileBase):
    user_id: UUID | None = None  # null = system agent
    system_prompt: str | None = Field(None, max_length=10000)
    agent_config: AgentConfig | None = None


class AgentProfileUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    name: str | None = Field(None, min_length=1, max_length=100)
    avatar: str | None = None
    description: str | None = None
    system_prompt: str | None = Field(None, max_length=10000)
    agent_config: AgentConfig | None = None
    status: AgentStatus | None = None


class AgentProfileRead(AgentProfileBase):
    id: UUID
    user_id: UUID | None = None
    system_prompt: str | None = None
    agent_config: dict | None = None
    status: AgentStatus = AgentStatus.OFFLINE

    model_config = ConfigDict(from_attributes=True, alias_generator=_to_camel, populate_by_name=True)

    @model_serializer(mode="wrap")
    def _mask_api_key(self, handler) -> dict:
        from ..core.crypto import decrypt_field
        data = handler(self)
        cfg = data.get("agent_config")
        if isinstance(cfg, dict) and "api_key" in cfg and cfg["api_key"]:
            try:
                real_key = decrypt_field(cfg["api_key"])
            except Exception:
                real_key = cfg["api_key"]  # Not encrypted (legacy data)
            cfg["api_key"] = f"****{real_key[-4:]}" if len(real_key) > 4 else "****"
        return data
