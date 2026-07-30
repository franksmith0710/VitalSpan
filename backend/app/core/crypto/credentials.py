from __future__ import annotations

from cryptography.fernet import InvalidToken

from app.core.config import get_settings
from app.core.crypto.fernet import decrypt_with_fernet_keys, fernet_candidate_keys
from app.core.crypto.sm4 import Sm4CredentialProvider

SM4_PREFIX = "sm4:"
FERNET_PREFIX = "fernet:"


class CredentialDecryptError(Exception):
    def __init__(self, message: str = "invalid encrypted credential") -> None:
        self.code = "INVALID_ENCRYPTED_CREDENTIAL"
        super().__init__(message)


def encrypt_credential(plain: str) -> str:
    settings = get_settings()
    body = Sm4CredentialProvider(settings.credential_sm4_key).encrypt(plain)
    return f"{SM4_PREFIX}{body}"


def _decrypt_body(prefix: str | None, body: str) -> str:
    settings = get_settings()
    if prefix == "sm4":
        try:
            return Sm4CredentialProvider(settings.credential_sm4_key).decrypt(body)
        except ValueError as exc:
            raise CredentialDecryptError() from exc
    if prefix == "fernet" or prefix is None:
        try:
            return decrypt_with_fernet_keys(body, fernet_candidate_keys(settings.credential_fernet_key))
        except InvalidToken as exc:
            raise CredentialDecryptError() from exc
    raise CredentialDecryptError(f"unknown cipher prefix: {prefix}")


def decrypt_credential(cipher: str) -> str:
    if cipher.startswith(SM4_PREFIX):
        return _decrypt_body("sm4", cipher[len(SM4_PREFIX) :])
    if cipher.startswith(FERNET_PREFIX):
        return _decrypt_body("fernet", cipher[len(FERNET_PREFIX) :])
    return _decrypt_body(None, cipher)


def is_sm4_ciphertext(cipher: str) -> bool:
    return cipher.startswith(SM4_PREFIX)
