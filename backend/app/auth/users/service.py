from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import AuthOrgNode, AuthRole, AuthUser, AuthUserRole
from app.auth.schemas import UserCreate


class UserError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def create_user(session: Session, payload: UserCreate) -> AuthUser:
    user = AuthUser(username=payload.username)
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise UserError("USERNAME_CONFLICT", "Username already exists", 409) from exc
    session.refresh(user)
    return user


def get_user(session: Session, user_id: uuid.UUID) -> AuthUser:
    user = session.get(AuthUser, user_id)
    if user is None:
        raise UserError("USER_NOT_FOUND", "User not found", 404)
    return user


def get_user_by_username(session: Session, username: str) -> AuthUser | None:
    return session.scalar(select(AuthUser).where(AuthUser.username == username))


def list_user_roles(session: Session, user_id: uuid.UUID) -> list[AuthRole]:
    get_user(session, user_id)
    return list(
        session.scalars(
            select(AuthRole)
            .join(AuthUserRole, AuthUserRole.role_id == AuthRole.id)
            .where(AuthUserRole.user_id == user_id)
            .order_by(AuthRole.code)
        )
    )


def bind_role(session: Session, user_id: uuid.UUID, role_id: uuid.UUID) -> None:
    get_user(session, user_id)
    role = session.get(AuthRole, role_id)
    if role is None:
        raise UserError("ROLE_NOT_FOUND", "Role not found", 404)
    existing = session.get(AuthUserRole, {"user_id": user_id, "role_id": role_id})
    if existing is None:
        session.add(AuthUserRole(user_id=user_id, role_id=role_id))
        session.commit()


def unbind_role(session: Session, user_id: uuid.UUID, role_id: uuid.UUID) -> None:
    get_user(session, user_id)
    binding = session.get(AuthUserRole, {"user_id": user_id, "role_id": role_id})
    if binding is None:
        raise UserError("BINDING_NOT_FOUND", "User-role binding not found", 404)
    session.delete(binding)
    session.commit()


def replace_user_roles(session: Session, user_id: uuid.UUID, role_ids: list[uuid.UUID]) -> list[AuthRole]:
    get_user(session, user_id)
    for role_id in role_ids:
        if session.get(AuthRole, role_id) is None:
            raise UserError("ROLE_NOT_FOUND", "Role not found", 404)
    session.query(AuthUserRole).filter(AuthUserRole.user_id == user_id).delete()
    for role_id in role_ids:
        session.add(AuthUserRole(user_id=user_id, role_id=role_id))
    session.commit()
    return list_user_roles(session, user_id)


def bind_roles_batch(session: Session, user_id: uuid.UUID, role_ids: list[uuid.UUID]) -> list[AuthRole]:
    get_user(session, user_id)
    for role_id in role_ids:
        if session.get(AuthRole, role_id) is None:
            raise UserError("ROLE_NOT_FOUND", "Role not found", 404)
        existing = session.get(AuthUserRole, {"user_id": user_id, "role_id": role_id})
        if existing is None:
            session.add(AuthUserRole(user_id=user_id, role_id=role_id))
    session.commit()
    return list_user_roles(session, user_id)


def resolve_role_codes_for_user(session: Session, user_id: uuid.UUID) -> list[str]:
    if session.get(AuthUser, user_id) is None:
        return []
    roles = list_user_roles(session, user_id)
    return [r.code for r in roles]


def resolve_role_codes_for_username(session: Session, username: str) -> list[str]:
    user = get_user_by_username(session, username)
    if user is None:
        return []
    return resolve_role_codes_for_user(session, user.id)


def assign_user_org(session: Session, user_id: uuid.UUID, org_node_id: uuid.UUID) -> AuthUser:
    user = get_user(session, user_id)
    if session.get(AuthOrgNode, org_node_id) is None:
        raise UserError("ORG_NOT_FOUND", "Org node not found", 404)
    user.org_node_id = org_node_id
    session.commit()
    session.refresh(user)
    return user


def get_user_org(session: Session, user_id: uuid.UUID) -> AuthOrgNode | None:
    user = get_user(session, user_id)
    if user.org_node_id is None:
        return None
    return session.get(AuthOrgNode, user.org_node_id)


def clear_user_org(session: Session, user_id: uuid.UUID) -> None:
    user = get_user(session, user_id)
    user.org_node_id = None
    session.commit()
