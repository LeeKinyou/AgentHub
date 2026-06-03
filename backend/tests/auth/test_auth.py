"""Tests for core/auth.py — JWT encode/decode/verify utilities."""

import pytest
from uuid import uuid4


def test_encode_decode_access_token():
    """encode_access_token → decode_access_token should return the same payload."""
    from app.core.auth import decode_access_token, encode_access_token

    user_id = uuid4()
    token = encode_access_token(user_id, username="kinyou")
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["username"] == "kinyou"
    assert "exp" in payload
    assert "jti" in payload


def test_decode_expired_token_raises():
    """An expired token should raise an error."""
    from datetime import timedelta

    from app.core.auth import decode_access_token, encode_access_token

    user_id = uuid4()
    token = encode_access_token(user_id, username="test", expires_delta=timedelta(seconds=-1))

    with pytest.raises(Exception):  # JWTError or ExpiredSignatureError
        decode_access_token(token)


def test_decode_invalid_token_raises():
    """A garbage token should raise an error."""
    from app.core.auth import decode_access_token

    with pytest.raises(Exception):
        decode_access_token("not.a.valid.token")


def test_encode_refresh_token():
    """encode_refresh_token should produce a valid token with 'type: refresh'."""
    from app.core.auth import decode_access_token, encode_refresh_token

    user_id = uuid4()
    token = encode_refresh_token(user_id)
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["type"] == "refresh"


def test_access_and_refresh_tokens_have_different_jti():
    """Access and refresh tokens for the same user should have different JTIs."""
    from app.core.auth import decode_access_token, encode_access_token, encode_refresh_token

    user_id = uuid4()
    access = encode_access_token(user_id, username="test")
    refresh = encode_refresh_token(user_id)

    access_jti = decode_access_token(access)["jti"]
    refresh_jti = decode_access_token(refresh)["jti"]

    assert access_jti != refresh_jti


def test_password_hash_and_verify():
    """hash_password + verify_password should roundtrip correctly."""
    from app.core.auth import hash_password, verify_password

    password = "my-secure-password-123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False
