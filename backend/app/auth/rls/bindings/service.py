from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.audit.write_hooks import record_platform_event
from app.auth.models import (
    AuthDimensionGroup,
    AuthDimensionGroupValue,
    AuthDimensionType,
    AuthRoleDimensionGroup,
    AuthRoleDimensionValue,
)
from app.auth.roles.service import get_role
from app.auth.rls.groups.service import validate_dimension_value


class BindingError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def resolve_effective_values(
    session: Session,
    role_id: uuid.UUID,
    dimension_type_id: uuid.UUID,
) -> list[str]:
    direct = session.scalars(
        select(AuthRoleDimensionValue.value).where(
            AuthRoleDimensionValue.role_id == role_id,
            AuthRoleDimensionValue.dimension_type_id == dimension_type_id,
        )
    )
    group_ids = list(
        session.scalars(
            select(AuthRoleDimensionGroup.group_id).where(AuthRoleDimensionGroup.role_id == role_id)
        )
    )
    from_groups: list[str] = []
    if group_ids:
        from_groups = list(
            session.scalars(
                select(AuthDimensionGroupValue.value).where(
                    AuthDimensionGroupValue.group_id.in_(group_ids)
                )
            )
        )
    merged = set(direct) | set(from_groups)
    return sorted(merged)


def _dedupe_preserve_order(ids: list[uuid.UUID]) -> list[uuid.UUID]:
    seen: set[uuid.UUID] = set()
    out: list[uuid.UUID] = []
    for gid in ids:
        if gid not in seen:
            seen.add(gid)
            out.append(gid)
    return out


def replace_role_dimension_values(
    session: Session,
    role_id: uuid.UUID,
    dimension_type_id: uuid.UUID,
    values: list[str],
    *,
    actor_roles: list[str],
    actor_id: str,
    actor_username: str | None,
    trace_id: str,
) -> None:
    role = get_role(session, role_id)
    from app.auth.roles.service import assert_role_active

    assert_role_active(role)
    dim = session.get(AuthDimensionType, dimension_type_id)
    if dim is None:
        raise BindingError("DIMENSION_NOT_FOUND", "Dimension type not found", 404)
    unique_values = sorted(set(values))
    for value in unique_values:
        validate_dimension_value(session, dim, value)
    session.query(AuthRoleDimensionValue).filter_by(
        role_id=role.id, dimension_type_id=dimension_type_id
    ).delete()
    for value in unique_values:
        session.add(
            AuthRoleDimensionValue(
                role_id=role.id, dimension_type_id=dimension_type_id, value=value
            )
        )
    record_platform_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_type="role",
        target_id=role.id,
        action="role.dimension.replace",
        detail={"dimension_type_id": str(dimension_type_id), "values": unique_values},
        trace_id=trace_id,
    )
    session.commit()


def replace_role_dimension_groups(
    session: Session,
    role_id: uuid.UUID,
    group_ids: list[uuid.UUID],
    *,
    actor_roles: list[str],
    actor_id: str,
    actor_username: str | None,
    trace_id: str,
) -> None:
    role = get_role(session, role_id)
    from app.auth.roles.service import assert_role_active

    assert_role_active(role)
    unique_ids = _dedupe_preserve_order(group_ids)
    for group_id in unique_ids:
        group = session.get(AuthDimensionGroup, group_id)
        if group is None:
            raise BindingError("GROUP_NOT_FOUND", "Group not found", 404)
    existing = set(
        session.scalars(
            select(AuthRoleDimensionGroup.group_id).where(
                AuthRoleDimensionGroup.role_id == role.id
            )
        )
    )
    desired = set(unique_ids)
    if existing == desired:
        return
    session.query(AuthRoleDimensionGroup).filter_by(role_id=role.id).delete()
    for group_id in unique_ids:
        session.add(AuthRoleDimensionGroup(role_id=role.id, group_id=group_id))
    record_platform_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_type="role",
        target_id=role.id,
        action="role.group.replace",
        detail={"group_ids": [str(g) for g in unique_ids]},
        trace_id=trace_id,
    )
    session.commit()
