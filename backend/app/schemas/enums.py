"""Unified enum definitions for schema and model validation."""

from enum import Enum


class SessionType(str, Enum):
    SINGLE = "single"
    GROUP = "group"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class SenderType(str, Enum):
    USER = "user"
    AGENT = "agent"


class ContentType(str, Enum):
    TEXT = "text"
    MARKDOWN = "markdown"
    CARD = "card"


class AgentRole(str, Enum):
    ORCHESTRATOR = "orchestrator"
    EXPERT = "expert"


class AdapterType(str, Enum):
    CLAUDE_CODE = "claude_code"
    CODEX = "codex"
    OPENCODE = "opencode"
    CUSTOM = "custom"


class AgentStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"
