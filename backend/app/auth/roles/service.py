from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import AuthResourceGrant, AuthRole, AuthUserRole
from app.auth.schemas import RoleCreate, RoleUpdate


class RoleError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def list_roles(session: Session) -> list[AuthRole]:
    return list(session.scalars(select(AuthRole).order_by(AuthRole.code)))


def create_role(session: Session, payload: RoleCreate) -> AuthRole:
    role = AuthRole(code=payload.code, name=payload.name, description=payload.description)
    session.add(role)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise RoleError("ROLE_CODE_CONFLICT", "Role code already exists", 409) from exc
    session.refresh(role)
    return role


def get_role(session: Session, role_id: uuid.UUID) -> AuthRole:
    role = session.get(AuthRole, role_id)
    if role is None:
        raise RoleError("ROLE_NOT_FOUND", "Role not found", 404)
    return role


def update_role(session: Session, role_id: uuid.UUID, payload: RoleUpdate) -> AuthRole:
    role = get_role(session, role_id)
    role.name = payload.name
    role.description = payload.description
    session.commit()
    session.refresh(role)
    return role


def delete_role(session: Session, role_id: uuid.UUID) -> None:
    role = get_role(session, role_id)
    user_refs = session.scalar(
        select(AuthUserRole).where(AuthUserRole.role_id == role_id).limit(1)
    )
    grant_refs = session.scalar(
        select(AuthResourceGrant).where(AuthResourceGrant.role_id == role_id).limit(1)
    )
    if user_refs or grant_refs:
        raise RoleError("ROLE_IN_USE", "Role is referenced by bindings or grants", 409)
    session.delete(role)
    session.commit()
