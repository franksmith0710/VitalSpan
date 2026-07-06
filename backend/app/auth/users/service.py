from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.audit import service as audit_service
from app.auth.models import AuthOrgNode, AuthRole, AuthUser, AuthUserRole
from app.auth.schemas import UserCreate


class UserError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def assert_binding_admin(actor_roles: list[str]) -> None:
    if "admin" not in actor_roles:
        raise UserError("BINDING_FORBIDDEN", "Binding changes require admin role", 403)


def _audit_user_event(
    session: Session,
    *,
    actor_id: str,
    actor_username: str | None,
    target_id: uuid.UUID,
    action: str,
    detail: dict | None,
    trace_id: str,
) -> None:
    audit_service.record_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_type="user",
        target_id=target_id,
        action=action,
        detail=detail,
        trace_id=trace_id,
    )


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


def list_users(
    session: Session,
    q: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[AuthUser], int]:
    capped = min(max(limit, 1), 500)
    base = select(AuthUser).order_by(AuthUser.username)
    count_stmt = select(func.count()).select_from(AuthUser)
    if q:
        pattern = f"%{q}%"
        base = base.where(AuthUser.username.ilike(pattern))
        count_stmt = count_stmt.where(AuthUser.username.ilike(pattern))
    total = session.scalar(count_stmt) or 0
    items = list(session.scalars(base.limit(capped).offset(max(offset, 0))))
    return items, total


def list_user_roles(session: Session, user_id: uuid.UUID) -> list[AuthRole]:
    get_user(session, user_id)
    return list(
        session.scalars(
            select(AuthRole)
            .join(AuthUserRole, AuthUserRole.role_id == AuthRole.id)
            .where(AuthUserRole.user_id == user_id, AuthRole.is_active.is_(True))
            .order_by(AuthRole.code)
        )
    )


def bind_role(
    session: Session,
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    *,
    actor_id: str,
    actor_username: str | None,
    actor_roles: list[str],
    trace_id: str,
) -> None:
    assert_binding_admin(actor_roles)
    get_user(session, user_id)
    role = session.get(AuthRole, role_id)
    if role is None:
        raise UserError("ROLE_NOT_FOUND", "Role not found", 404)
    from app.auth.roles.service import assert_role_active

    assert_role_active(role)
    existing = session.get(AuthUserRole, {"user_id": user_id, "role_id": role_id})
    if existing is None:
        session.add(AuthUserRole(user_id=user_id, role_id=role_id))
        _audit_user_event(
            session,
            actor_id=actor_id,
            actor_username=actor_username,
            target_id=user_id,
            action="user.role.bind",
            detail={"role_id": str(role_id), "role_code": role.code},
            trace_id=trace_id,
        )
        session.commit()


def unbind_role(
    session: Session,
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    *,
    actor_id: str,
    actor_username: str | None,
    actor_roles: list[str],
    trace_id: str,
) -> None:
    assert_binding_admin(actor_roles)
    get_user(session, user_id)
    role = session.get(AuthRole, role_id)
    binding = session.get(AuthUserRole, {"user_id": user_id, "role_id": role_id})
    if binding is None:
        raise UserError("BINDING_NOT_FOUND", "User-role binding not found", 404)
    session.delete(binding)
    _audit_user_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_id=user_id,
        action="user.role.unbind",
        detail={"role_id": str(role_id), "role_code": role.code if role else None},
        trace_id=trace_id,
    )
    session.commit()


def replace_user_roles(
    session: Session,
    user_id: uuid.UUID,
    role_ids: list[uuid.UUID],
    *,
    actor_id: str,
    actor_username: str | None,
    actor_roles: list[str],
    trace_id: str,
) -> list[AuthRole]:
    assert_binding_admin(actor_roles)
    get_user(session, user_id)
    for role_id in role_ids:
        if session.get(AuthRole, role_id) is None:
            raise UserError("ROLE_NOT_FOUND", "Role not found", 404)
    from app.auth.roles.service import assert_role_active

    for role_id in role_ids:
        role = session.get(AuthRole, role_id)
        assert role is not None
        assert_role_active(role)
    session.query(AuthUserRole).filter(AuthUserRole.user_id == user_id).delete()
    for role_id in role_ids:
        session.add(AuthUserRole(user_id=user_id, role_id=role_id))
    _audit_user_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_id=user_id,
        action="user.roles.replace",
        detail={"role_ids": [str(r) for r in role_ids]},
        trace_id=trace_id,
    )
    session.commit()
    return list_user_roles(session, user_id)


def bind_roles_batch(
    session: Session,
    user_id: uuid.UUID,
    role_ids: list[uuid.UUID],
    *,
    actor_id: str,
    actor_username: str | None,
    actor_roles: list[str],
    trace_id: str,
) -> list[AuthRole]:
    assert_binding_admin(actor_roles)
    get_user(session, user_id)
    new_role_ids: list[uuid.UUID] = []
    for role_id in role_ids:
        role = session.get(AuthRole, role_id)
        if role is None:
            raise UserError("ROLE_NOT_FOUND", "Role not found", 404)
        from app.auth.roles.service import assert_role_active

        assert_role_active(role)
        existing = session.get(AuthUserRole, {"user_id": user_id, "role_id": role_id})
        if existing is None:
            session.add(AuthUserRole(user_id=user_id, role_id=role_id))
            new_role_ids.append(role_id)
    if new_role_ids:
        _audit_user_event(
            session,
            actor_id=actor_id,
            actor_username=actor_username,
            target_id=user_id,
            action="user.role.bind",
            detail={"role_ids": [str(r) for r in new_role_ids]},
            trace_id=trace_id,
        )
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


def assign_user_org(
    session: Session,
    user_id: uuid.UUID,
    org_node_id: uuid.UUID,
    *,
    actor_id: str,
    actor_username: str | None,
    actor_roles: list[str],
    trace_id: str,
) -> AuthUser:
    assert_binding_admin(actor_roles)
    user = get_user(session, user_id)
    if session.get(AuthOrgNode, org_node_id) is None:
        raise UserError("ORG_NOT_FOUND", "Org node not found", 404)
    user.org_node_id = org_node_id
    _audit_user_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_id=user_id,
        action="user.org.assign",
        detail={"org_node_id": str(org_node_id)},
        trace_id=trace_id,
    )
    session.commit()
    session.refresh(user)
    return user


def get_user_org(session: Session, user_id: uuid.UUID) -> AuthOrgNode | None:
    user = get_user(session, user_id)
    if user.org_node_id is None:
        return None
    return session.get(AuthOrgNode, user.org_node_id)


def clear_user_org(
    session: Session,
    user_id: uuid.UUID,
    *,
    actor_id: str,
    actor_username: str | None,
    actor_roles: list[str],
    trace_id: str,
) -> None:
    assert_binding_admin(actor_roles)
    user = get_user(session, user_id)
    if user.org_node_id is None:
        return
    org_id = user.org_node_id
    user.org_node_id = None
    _audit_user_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_id=user_id,
        action="user.org.clear",
        detail={"org_node_id": str(org_id)},
        trace_id=trace_id,
    )
    session.commit()
