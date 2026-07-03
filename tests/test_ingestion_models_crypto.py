import pytest

from app.ingestion.models import decrypt_password, encrypt_password


def test_encrypt_password_decrypt_password_roundtrip():
    """T-D04-05: encrypt → decrypt 明文一致。"""
    plain = "sample-mysql-password"
    cipher = encrypt_password(plain)
    assert cipher != plain
    assert decrypt_password(cipher) == plain


def test_decrypt_password_invalid_token_raises_value_error():
    """T-D04-06: 篡改密文抛 ValueError。"""
    with pytest.raises(ValueError, match="invalid encrypted password"):
        decrypt_password("AAAA-invalid-ciphertext-token")
