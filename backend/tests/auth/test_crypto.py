"""Tests for core/crypto.py — Fernet symmetric encryption for API key storage."""

import pytest


def test_encrypt_decrypt_roundtrip():
    """encrypt_field → decrypt_field should return the original plaintext."""
    from app.core.crypto import decrypt_field, encrypt_field

    plaintext = "sk-ant-api03-abcdefghij1234567890"
    ciphertext = encrypt_field(plaintext)

    assert ciphertext != plaintext
    assert decrypt_field(ciphertext) == plaintext


def test_encrypt_produces_different_ciphertext_each_time():
    """Fernet uses a random IV, so two encryptions of the same text differ."""
    from app.core.crypto import encrypt_field

    plaintext = "same-secret"
    c1 = encrypt_field(plaintext)
    c2 = encrypt_field(plaintext)

    assert c1 != c2
    # But both decrypt to the same value
    from app.core.crypto import decrypt_field
    assert decrypt_field(c1) == decrypt_field(c2) == plaintext


def test_decrypt_with_wrong_key_raises():
    """Decrypting with a different key should raise InvalidToken."""
    from cryptography.fernet import InvalidToken

    from app.core.crypto import decrypt_field, encrypt_field

    ciphertext = encrypt_field("secret")
    # Tamper with the ciphertext
    tampered = ciphertext[:-4] + "xxxx"

    with pytest.raises(InvalidToken):
        decrypt_field(tampered)


def test_encrypt_empty_string():
    """Empty string should be encrypted and decrypted back to empty."""
    from app.core.crypto import decrypt_field, encrypt_field

    assert decrypt_field(encrypt_field("")) == ""
