from __future__ import annotations

import uuid

import bcrypt
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.auth.models import AuthUser
from app.auth.users import service as user_service


class LoginError(Exception):
    def __init__(self, code: str, message: str, status: int = 401) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def authenticate(session: Session, username: str, password: str) -> AuthUser:
    try:
        user = user_service.get_user_by_username(session, username)
    except (OperationalError, ProgrammingError):
        raise LoginError("AUTH_INVALID_CREDENTIALS", "用户名或密码错误", 401) from None
    if user is None or not user.password_hash:
        raise LoginError("AUTH_INVALID_CREDENTIALS", "用户名或密码错误", 401)
    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        raise LoginError("AUTH_INVALID_CREDENTIALS", "用户名或密码错误", 401)
    return user


def resolve_role_codes(session: Session, user_id: uuid.UUID) -> list[str]:
    return user_service.resolve_role_codes_for_user(session, user_id)
