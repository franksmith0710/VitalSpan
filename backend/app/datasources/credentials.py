from __future__ import annotations

import os

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class CredentialDecryptError(Exception):
    def __init__(self, message: str = "invalid encrypted credential") -> None:
        self.code = "INVALID_ENCRYPTED_CREDENTIAL"
        super().__init__(message)


def _fernet_for_key(key: str) -> Fernet:
    return Fernet(key.encode())


def _candidate_keys() -> list[str]:
    keys = [get_settings().credential_fernet_key]
    previous = os.getenv("CREDENTIAL_FERNET_KEY_PREVIOUS")
    if previous:
        keys.append(previous)
    return keys


def encrypt_credential(plain: str) -> str:
    return _fernet_for_key(get_settings().credential_fernet_key).encrypt(plain.encode()).decode()


def decrypt_credential(cipher: str) -> str:
    last_error: InvalidToken | None = None
    for key in _candidate_keys():
        try:
            return _fernet_for_key(key).decrypt(cipher.encode()).decode()
        except InvalidToken as exc:
            last_error = exc
    raise CredentialDecryptError() from last_error
