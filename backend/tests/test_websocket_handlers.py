"""Tests for WebSocket handler function extraction.

Bug #16: websocket_endpoint is ~250 lines handling everything.
Should be split into focused handler functions.
"""
import inspect

from app.routes import websocket


def test_handle_send_message_exists():
    """_handle_send_message should be extracted as a separate function."""
    assert hasattr(websocket, "_handle_send_message"), (
        "websocket module should have _handle_send_message function"
    )
    assert inspect.isfunction(websocket._handle_send_message)


def test_handle_trigger_action_exists():
    """_handle_trigger_action should be extracted as a separate function."""
    assert hasattr(websocket, "_handle_trigger_action"), (
        "websocket module should have _handle_trigger_action function"
    )
    assert inspect.isfunction(websocket._handle_trigger_action)


def test_handle_send_message_is_async():
    """_handle_send_message should be an async function."""
    assert inspect.iscoroutinefunction(websocket._handle_send_message)


def test_handle_trigger_action_is_async():
    """_handle_trigger_action should be an async function."""
    assert inspect.iscoroutinefunction(websocket._handle_trigger_action)


def test_websocket_endpoint_still_exists():
    """websocket_endpoint should still be the main entry point."""
    assert hasattr(websocket, "websocket_endpoint")
    assert inspect.isfunction(websocket.websocket_endpoint)
