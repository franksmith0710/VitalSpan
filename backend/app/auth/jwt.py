from __future__ import annotations

import time
from typing import Any

import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"
DEFAULT_EXPIRES_MINUTES = 480
# 兼容发布窗口：0024 部署前签发的历史 token 缺 tokenVersion，按版本 1 解析。
# 全量重新登录后可移除该默认值，改为拒绝无版本声明的 token。
DEFAULT_TOKEN_VERSION = 1


class JwtError(Exception):
    pass


def create_access_token(
    user_id: str,
    username: str,
    *,
    expires_minutes: int = DEFAULT_EXPIRES_MINUTES,
    token_version: int = DEFAULT_TOKEN_VERSION,
) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "username": username,
        "tokenVersion": token_version,
        "iat": now,
        "exp": now + expires_minutes * 60,
    }
    return jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise JwtError("invalid token") from exc


def token_version_from_claims(claims: dict[str, Any]) -> int:
    """从 JWT claims 读取 tokenVersion；历史 token 缺该声明时按版本 1 兼容。"""
    raw = claims.get("tokenVersion", DEFAULT_TOKEN_VERSION)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return DEFAULT_TOKEN_VERSION
