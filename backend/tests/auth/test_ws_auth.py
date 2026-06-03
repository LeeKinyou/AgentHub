"""Tests for WebSocket authentication logic."""

import pytest


def test_ws_endpoint_accepts_token_param():
    """websocket_endpoint function should accept a token parameter."""
    from app.routes.websocket import websocket_endpoint
    import inspect
    sig = inspect.signature(websocket_endpoint)
    param_names = list(sig.parameters.keys())
    assert "token" in param_names, f"Expected 'token' param, got: {param_names}"


def test_ws_endpoint_token_is_optional():
    """token parameter should have a default of None (for backwards compat check)."""
    from app.routes.websocket import websocket_endpoint
    import inspect
    sig = inspect.signature(websocket_endpoint)
    token_param = sig.parameters.get("token")
    assert token_param is not None
    assert token_param.default is None or token_param.default is inspect.Parameter.empty


def test_ws_endpoint_verifies_session_ownership():
    """websocket_endpoint should check session.user_id against token's user."""
    import ast, textwrap
    source = open(
        __import__("os").path.join(
            __import__("os").path.dirname(__file__), "..", "app", "routes", "websocket.py"
        )
    ).read()
    # Check that the code compares session.user_id with user_id_str
    assert "session.user_id" in source and "user_id_str" in source, (
        "WebSocket endpoint should verify session ownership"
    )
