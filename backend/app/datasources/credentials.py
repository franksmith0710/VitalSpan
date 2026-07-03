from __future__ import annotations

# 密钥轮换 placeholder: 未来 CREDENTIAL_FERNET_KEY_PREVIOUS 双钥解密，本轮不实现。

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class CredentialDecryptError(Exception):
    def __init__(self, message: str = "invalid encrypted credential") -> None:
        self.code = "INVALID_ENCRYPTED_CREDENTIAL"
        super().__init__(message)


def _fernet() -> Fernet:
    return Fernet(get_settings().credential_fernet_key.encode())


def encrypt_credential(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_credential(cipher: str) -> str:
    try:
        return _fernet().decrypt(cipher.encode()).decode()
    except InvalidToken as exc:
        raise CredentialDecryptError() from exc
