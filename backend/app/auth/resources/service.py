from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import AuthResourceGrant, AuthRole
from app.auth.schemas import ResourceGrantCreate


class GrantError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def list_grants(
    session: Session,
    role_id: uuid.UUID | None = None,
    resource_type: str | None = None,
) -> list[AuthResourceGrant]:
    stmt = select(AuthResourceGrant).order_by(AuthResourceGrant.created_at)
    if role_id is not None:
        stmt = stmt.where(AuthResourceGrant.role_id == role_id)
    if resource_type is not None:
        stmt = stmt.where(AuthResourceGrant.resource_type == resource_type)
    return list(session.scalars(stmt))


def create_grant(session: Session, payload: ResourceGrantCreate) -> AuthResourceGrant:
    if session.get(AuthRole, payload.role_id) is None:
        raise GrantError("ROLE_NOT_FOUND", "Role not found", 404)
    grant = AuthResourceGrant(
        role_id=payload.role_id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
    )
    session.add(grant)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise GrantError("GRANT_ALREADY_EXISTS", "Resource grant already exists", 409) from exc
    session.refresh(grant)
    return grant


def delete_grant(session: Session, grant_id: uuid.UUID) -> None:
    grant = session.get(AuthResourceGrant, grant_id)
    if grant is None:
        raise GrantError("GRANT_NOT_FOUND", "Resource grant not found", 404)
    session.delete(grant)
    session.commit()


def check_resource_access(
    session: Session,
    role_codes: list[str],
    resource_type: str,
    resource_id: uuid.UUID,
) -> bool:
    if not role_codes:
        return False
    stmt = (
        select(AuthResourceGrant.id)
        .join(AuthRole, AuthRole.id == AuthResourceGrant.role_id)
        .where(
            AuthRole.code.in_(role_codes),
            AuthResourceGrant.resource_type == resource_type,
            AuthResourceGrant.resource_id == resource_id,
        )
        .limit(1)
    )
    return session.scalar(stmt) is not None
