from __future__ import annotations

import os

from cryptography.fernet import Fernet, InvalidToken


class FernetCredentialProvider:
    prefix = "fernet"

    def __init__(self, key: str) -> None:
        self._fernet = Fernet(key.encode())

    def encrypt(self, plain: str) -> str:
        return self._fernet.encrypt(plain.encode()).decode()

    def decrypt(self, cipher_body: str) -> str:
        return self._fernet.decrypt(cipher_body.encode()).decode()


def fernet_candidate_keys(primary: str) -> list[str]:
    keys = [primary]
    previous = os.getenv("CREDENTIAL_FERNET_KEY_PREVIOUS")
    if previous:
        keys.append(previous)
    return keys


def decrypt_with_fernet_keys(cipher_body: str, keys: list[str]) -> str:
    last_error: InvalidToken | None = None
    for key in keys:
        try:
            return FernetCredentialProvider(key).decrypt(cipher_body)
        except InvalidToken as exc:
            last_error = exc
    raise InvalidToken("fernet decrypt failed") from last_error
