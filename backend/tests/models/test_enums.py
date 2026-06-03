"""Tests for schemas/enums.py — unified enum constraints for all model fields."""

import pytest
from pydantic import ValidationError


def test_session_type_enum():
    """SessionCreate should only accept 'single' or 'group'."""
    from app.schemas.session import SessionCreate

    # Valid values
    s1 = SessionCreate(agent_ids=["00000000-0000-0000-0000-000000000001"], type="single")
    assert s1.type == "single"
    s2 = SessionCreate(agent_ids=["00000000-0000-0000-0000-000000000001"], type="group")
    assert s2.type == "group"

    # Invalid value
    with pytest.raises(ValidationError):
        SessionCreate(agent_ids=["00000000-0000-0000-0000-000000000001"], type="invalid")


def test_agent_role_enum():
    """AgentProfileCreate should only accept valid role values."""
    from app.schemas.agent import AgentProfileCreate

    valid_roles = ["frontend", "backend", "fullstack", "designer", "devops", "planner"]
    uid = "00000000-0000-0000-0000-000000000001"

    for role in valid_roles:
        a = AgentProfileCreate(user_id=uid, name="test", role=role, adapter_type="claude_code")
        assert a.role == role

    with pytest.raises(ValidationError):
        AgentProfileCreate(user_id=uid, name="test", role="hacker", adapter_type="claude_code")


def test_adapter_type_enum():
    """AgentProfileCreate should only accept valid adapter_type values."""
    from app.schemas.agent import AgentProfileCreate

    uid = "00000000-0000-0000-0000-000000000001"
    valid_types = ["claude_code", "codex", "opencode", "custom"]

    for at in valid_types:
        a = AgentProfileCreate(user_id=uid, name="test", role="frontend", adapter_type=at)
        assert a.adapter_type == at

    with pytest.raises(ValidationError):
        AgentProfileCreate(user_id=uid, name="test", role="frontend", adapter_type="malicious")


def test_sender_type_enum():
    """sender_type should only accept 'user' or 'agent'."""
    from app.schemas.enums import SenderType

    assert SenderType.USER == "user"
    assert SenderType.AGENT == "agent"

    with pytest.raises(ValueError):
        SenderType("system")


def test_content_type_enum():
    """ContentType should only accept 'text', 'markdown', or 'card'."""
    from app.schemas.enums import ContentType

    assert ContentType.TEXT == "text"
    assert ContentType.MARKDOWN == "markdown"
    assert ContentType.CARD == "card"

    with pytest.raises(ValueError):
        ContentType("html")
