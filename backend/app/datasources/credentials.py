from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _fernet() -> Fernet:
    return Fernet(get_settings().credential_fernet_key.encode())


def encrypt_credential(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_credential(cipher: str) -> str:
    try:
        return _fernet().decrypt(cipher.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("invalid encrypted credential") from exc
