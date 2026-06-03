"""Tests for error message sanitization — no internal details leaked to clients."""

import pytest


def test_safe_error_messages_defined():
    """SAFE_ERROR_MESSAGES should map all known error codes to safe messages."""
    from app.core.exception_handler import SAFE_ERROR_MESSAGES

    expected_codes = ["TIMEOUT", "CONNECTION_ERROR", "UNKNOWN_ERROR"]
    for code in expected_codes:
        assert code in SAFE_ERROR_MESSAGES
        # Safe messages should not contain file paths, IPs, or stack traces
        msg = SAFE_ERROR_MESSAGES[code]
        assert "\\" not in msg
        assert "/" not in msg
        assert "Traceback" not in msg
        assert "Error:" not in msg


def test_safe_error_message_function():
    """safe_error_message() should return safe messages, not raw exception text."""
    from app.core.exception_handler import safe_error_message

    # Even with a detailed exception, the safe message should be generic
    exc = ValueError("Database connection failed at 175.178.158.231:5432 with password xyz")
    msg = safe_error_message("UNKNOWN_ERROR", exc)
    assert "175.178.158.231" not in msg
    assert "password" not in msg
    assert "xyz" not in msg


def test_safe_error_message_known_code():
    """Known error codes should return the predefined safe message."""
    from app.core.exception_handler import SAFE_ERROR_MESSAGES, safe_error_message

    exc = TimeoutError("Connection timed out")
    msg = safe_error_message("TIMEOUT", exc)
    assert msg == SAFE_ERROR_MESSAGES["TIMEOUT"]
