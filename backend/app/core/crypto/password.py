from __future__ import annotations

import binascii
import secrets
import bcrypt
from gmssl import sm3, func

from app.core.config import get_settings

SM3_PREFIX = "$sm3$"


def is_legacy_bcrypt_hash(password_hash: str) -> bool:
    return password_hash.startswith(("$2a$", "$2b$", "$2y$"))


def _sm3_hex(data: bytes) -> str:
    return sm3.sm3_hash(func.bytes_to_list(data))


def _hash_sm3(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = _sm3_hex(f"{salt}{password}".encode())
    return f"{SM3_PREFIX}{salt}${digest}"


def _verify_sm3(password: str, password_hash: str) -> bool:
    if not password_hash.startswith(SM3_PREFIX):
        return False
    rest = password_hash[len(SM3_PREFIX) :]
    parts = rest.split("$", 1)
    if len(parts) != 2:
        return False
    salt, expected = parts
    try:
        binascii.unhexlify(salt)
        binascii.unhexlify(expected)
    except (binascii.Error, ValueError):
        return False
    actual = _sm3_hex(f"{salt}{password}".encode())
    return secrets.compare_digest(actual, expected)


def hash_password(password: str) -> str:
    settings = get_settings()
    if settings.password_hash_algorithm == "bcrypt":
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    return _hash_sm3(password)


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    if password_hash.startswith(SM3_PREFIX):
        return _verify_sm3(password, password_hash)
    if is_legacy_bcrypt_hash(password_hash):
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    return False


def needs_password_rehash(password_hash: str) -> bool:
    settings = get_settings()
    if settings.password_hash_algorithm == "bcrypt":
        return False
    return is_legacy_bcrypt_hash(password_hash)
