import os

import pytest
from pydantic import ValidationError

from app.core.config import Settings
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


def test_settings_invalid_credential_fernet_key_length_raises(monkeypatch):
    """T-D04-10: 43 字符非法 Fernet key → Settings 加载失败。"""
    monkeypatch.setenv("CREDENTIAL_FERNET_KEY", "x" * 43)
    with pytest.raises(ValidationError):
        Settings(
            database_url=os.environ["DATABASE_URL"],
            secret_key=os.environ["SECRET_KEY"],
        )


def test_encrypt_password_with_env_fernet_key_roundtrip():
    """T-D04-13: CREDENTIAL_FERNET_KEY 启用路径 encrypt ≠ 明文且 decrypt roundtrip。"""
    assert os.environ.get("CREDENTIAL_FERNET_KEY")
    plain = "analytics-source-password"
    cipher = encrypt_password(plain)
    assert cipher != plain
    assert decrypt_password(cipher) == plain
