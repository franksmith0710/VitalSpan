from __future__ import annotations

import uuid

import bcrypt
from sqlalchemy.orm import Session

from app.auth.audit import service as audit_service
from app.auth.models import AuthUser
from app.auth.profile.schemas import MeProfileOut, MeProfileUpdate
from app.auth.users import service as user_service
from app.auth.users.service import UserError
from app.core.logging import trace_id_var


class ProfileError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _default_email(username: str) -> str:
    return f"{username}@vitalspan.local"


def _display_name(user: AuthUser) -> str:
    return (user.display_name or user.username).strip()


def _email(user: AuthUser) -> str:
    return (user.email or _default_email(user.username)).strip()


def build_me_profile(session: Session, user_id: uuid.UUID, roles: list[str]) -> MeProfileOut:
    try:
        user = user_service.get_user(session, user_id)
    except UserError as exc:
        raise ProfileError(exc.code, exc.message, exc.status) from exc
    return MeProfileOut(
        id=str(user.id),
        username=user.username,
        display_name=_display_name(user),
        email=_email(user),
        roles=roles,
    )


def update_me_profile(
    session: Session,
    *,
    user_id: uuid.UUID,
    roles: list[str],
    actor_username: str,
    payload: MeProfileUpdate,
) -> MeProfileOut:
    user = user_service.get_user(session, user_id)
    changes: dict[str, str] = {}
    if payload.display_name is not None:
        user.display_name = payload.display_name.strip()
        changes["displayName"] = user.display_name
    if payload.email is not None:
        user.email = payload.email
        changes["email"] = user.email
    if not changes:
        raise ProfileError("PROFILE_NO_CHANGES", "No profile fields to update", 422)
    trace_id = trace_id_var.get() or uuid.uuid4().hex
    audit_service.record_event(
        session,
        actor_id=str(user_id),
        actor_username=actor_username,
        target_type="user",
        target_id=user.id,
        action="profile.update",
        detail=changes,
        trace_id=trace_id,
    )
    session.commit()
    session.refresh(user)
    return build_me_profile(session, user_id, roles)


def change_password(
    session: Session,
    *,
    user_id: uuid.UUID,
    actor_username: str,
    current_password: str,
    new_password: str,
) -> None:
    user = user_service.get_user(session, user_id)
    if not user.password_hash:
        raise ProfileError("AUTH_PASSWORD_NOT_SET", "Password is not configured for this account", 422)
    if not bcrypt.checkpw(current_password.encode(), user.password_hash.encode()):
        raise ProfileError("AUTH_INVALID_CURRENT_PASSWORD", "当前密码不正确", 401)
    if current_password == new_password:
        raise ProfileError("AUTH_PASSWORD_UNCHANGED", "新密码不能与当前密码相同", 422)
    user.password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    trace_id = trace_id_var.get() or uuid.uuid4().hex
    audit_service.record_event(
        session,
        actor_id=str(user_id),
        actor_username=actor_username,
        target_type="user",
        target_id=user.id,
        action="password.change",
        detail=None,
        trace_id=trace_id,
    )
    session.commit()
