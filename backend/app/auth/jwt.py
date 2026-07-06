from __future__ import annotations

import time
from typing import Any

import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"
DEFAULT_EXPIRES_MINUTES = 480


class JwtError(Exception):
    pass


def create_access_token(user_id: str, username: str, *, expires_minutes: int = DEFAULT_EXPIRES_MINUTES) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "username": username,
        "iat": now,
        "exp": now + expires_minutes * 60,
    }
    return jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise JwtError("invalid token") from exc
