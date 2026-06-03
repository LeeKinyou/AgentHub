"""Tests for MCP server command whitelist — prevent arbitrary command execution."""

import pytest


def test_allowed_commands_whitelist_defined():
    """ALLOWED_MCP_COMMANDS should exist and contain safe commands."""
    from app.core.mcp_manager import ALLOWED_MCP_COMMANDS

    assert isinstance(ALLOWED_MCP_COMMANDS, set)
    assert len(ALLOWED_MCP_COMMANDS) > 0
    # Common safe commands should be allowed
    assert "npx" in ALLOWED_MCP_COMMANDS
    assert "node" in ALLOWED_MCP_COMMANDS
    assert "python" in ALLOWED_MCP_COMMANDS


def test_validate_command_allows_safe():
    """validate_command should not raise for allowed commands."""
    from app.core.mcp_manager import validate_command

    for cmd in ["npx", "node", "python", "uvx"]:
        validate_command(cmd)  # Should not raise


def test_validate_command_blocks_dangerous():
    """validate_command should raise ValueError for dangerous commands."""
    from app.core.mcp_manager import validate_command

    dangerous = ["rm", "curl", "wget", "bash", "sh", "powershell", "cmd", "eval"]
    for cmd in dangerous:
        with pytest.raises(ValueError, match="not allowed"):
            validate_command(cmd)


def test_validate_command_blocks_empty():
    """validate_command should reject empty command."""
    from app.core.mcp_manager import validate_command

    with pytest.raises(ValueError):
        validate_command("")
