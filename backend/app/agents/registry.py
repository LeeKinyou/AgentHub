from typing import Type

from .base_adapter import BaseAdapter
from .providers.claude_code import ClaudeCodeAdapter
from .providers.codex import CodexAdapter
from .providers.custom import CustomAdapter
from .providers.opencode import OpenCodeAdapter

ADAPTER_REGISTRY: dict[str, Type[BaseAdapter]] = {
    "claude_code": ClaudeCodeAdapter,
    "codex": CodexAdapter,
    "opencode": OpenCodeAdapter,
    "custom": CustomAdapter,
}


def get_adapter(adapter_type: str, agent_config: dict | None = None) -> BaseAdapter:
    """Get adapter instance by type.

    Args:
        adapter_type: One of claude_code, codex, opencode, custom
        agent_config: Configuration dict for custom agents (tools, skills, mcp, system_prompt)

    Raises:
        NotImplementedError: If adapter_type is 'codex' or 'opencode' (not yet implemented).
    """
    if adapter_type not in ADAPTER_REGISTRY:
        raise ValueError(f"Unknown adapter type: {adapter_type}")

    if adapter_type in ("codex", "opencode"):
        raise NotImplementedError(
            f"Adapter '{adapter_type}' is not yet implemented. "
            f"Please use 'claude_code' or 'custom' adapter instead."
        )

    if adapter_type == "custom":
        return CustomAdapter(agent_config=agent_config)

    return ADAPTER_REGISTRY[adapter_type]()
