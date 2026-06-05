"""Tests for WebSocket message schema validation.

Bug #20: WebSocket schemas exist in schemas/ws.py but are never used.
Incoming messages should be validated against these schemas.
"""
import pytest
from pydantic import ValidationError


def test_ws_send_message_valid():
    """Valid sendMessage payload should pass validation."""
    from app.schemas.ws import WSSendMessage

    msg = WSSendMessage.model_validate({
        "type": "sendMessage",
        "timestamp": "2026-01-01T00:00:00Z",
        "payload": {
            "sessionId": "550e8400-e29b-41d4-a716-446655440000",
            "content": "hello",
        },
    })
    assert msg.type == "sendMessage"
    assert str(msg.payload.session_id) == "550e8400-e29b-41d4-a716-446655440000"
    assert msg.payload.content == "hello"


def test_ws_send_message_missing_content():
    """sendMessage without content should fail validation."""
    from app.schemas.ws import WSSendMessage

    with pytest.raises(ValidationError):
        WSSendMessage.model_validate({
            "type": "sendMessage",
            "timestamp": "2026-01-01T00:00:00Z",
            "payload": {
                "sessionId": "550e8400-e29b-41d4-a716-446655440000",
            },
        })


def test_ws_send_message_empty_content():
    """sendMessage with empty content should fail validation."""
    from app.schemas.ws import WSSendMessage

    with pytest.raises(ValidationError):
        WSSendMessage.model_validate({
            "type": "sendMessage",
            "timestamp": "2026-01-01T00:00:00Z",
            "payload": {
                "sessionId": "550e8400-e29b-41d4-a716-446655440000",
                "content": "",
            },
        })


def test_ws_trigger_action_valid():
    """Valid triggerAction payload should pass validation."""
    from app.schemas.ws import WSTriggerAction

    msg = WSTriggerAction.model_validate({
        "type": "triggerAction",
        "timestamp": "2026-01-01T00:00:00Z",
        "payload": {
            "messageId": "550e8400-e29b-41d4-a716-446655440000",
            "actionType": "applyDiff",
        },
    })
    assert msg.type == "triggerAction"
    assert msg.payload.action_type == "applyDiff"


def test_ws_trigger_action_invalid_action_type():
    """triggerAction with unknown actionType should fail validation."""
    from app.schemas.ws import WSTriggerAction

    with pytest.raises(ValidationError):
        WSTriggerAction.model_validate({
            "type": "triggerAction",
            "timestamp": "2026-01-01T00:00:00Z",
            "payload": {
                "messageId": "550e8400-e29b-41d4-a716-446655440000",
                "actionType": "unknownAction",
            },
        })


def test_ws_trigger_action_missing_message_id():
    """triggerAction without messageId should fail validation."""
    from app.schemas.ws import WSTriggerAction

    with pytest.raises(ValidationError):
        WSTriggerAction.model_validate({
            "type": "triggerAction",
            "timestamp": "2026-01-01T00:00:00Z",
            "payload": {
                "actionType": "applyDiff",
            },
        })


def test_ws_schemas_use_camel_case_aliases():
    """Schemas should accept camelCase from wire format."""
    from app.schemas.ws import WSSendMessage

    msg = WSSendMessage.model_validate({
        "type": "sendMessage",
        "timestamp": "2026-01-01T00:00:00Z",
        "payload": {
            "sessionId": "550e8400-e29b-41d4-a716-446655440000",
            "content": "test",
        },
    })
    # Should serialize back to camelCase
    dumped = msg.model_dump(by_alias=True)
    assert "sessionId" in dumped["payload"]
    assert "session_id" not in dumped["payload"]


def test_validate_ws_message_dispatch():
    """validate_ws_message should route to correct schema based on type."""
    from app.schemas.ws import validate_ws_message

    # Valid sendMessage
    result = validate_ws_message({
        "type": "sendMessage",
        "timestamp": "2026-01-01T00:00:00Z",
        "payload": {
            "sessionId": "550e8400-e29b-41d4-a716-446655440000",
            "content": "hello",
        },
    })
    assert result is not None
    assert result.type == "sendMessage"

    # Valid triggerAction
    result = validate_ws_message({
        "type": "triggerAction",
        "timestamp": "2026-01-01T00:00:00Z",
        "payload": {
            "messageId": "550e8400-e29b-41d4-a716-446655440000",
            "actionType": "applyDiff",
        },
    })
    assert result is not None
    assert result.type == "triggerAction"

    # Valid ping
    result = validate_ws_message({
        "type": "ping",
        "timestamp": "2026-01-01T00:00:00Z",
    })
    assert result is not None
    assert result.type == "ping"


def test_validate_ws_message_returns_none_for_unknown():
    """Unknown message type should return None."""
    from app.schemas.ws import validate_ws_message

    result = validate_ws_message({"type": "unknownType"})
    assert result is None


def test_validate_ws_message_returns_none_for_invalid():
    """Invalid payload should return None."""
    from app.schemas.ws import validate_ws_message

    result = validate_ws_message({
        "type": "sendMessage",
        "timestamp": "2026-01-01T00:00:00Z",
        "payload": {"sessionId": "not-a-uuid", "content": "test"},
    })
    assert result is None
