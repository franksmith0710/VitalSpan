from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import (
    AuthDimensionGroup,
    AuthDimensionGroupValue,
    AuthDimensionType,
    AuthRoleDimensionGroup,
    AuthRoleDimensionValue,
)
from app.auth.roles.service import get_role
from app.auth.rls.groups.service import validate_dimension_value
from app.auth.users.service import assert_binding_admin


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


def replace_role_dimension_values(
    session: Session,
    role_id: uuid.UUID,
    dimension_type_id: uuid.UUID,
    values: list[str],
    *,
    actor_roles: list[str],
) -> None:
    assert_binding_admin(actor_roles)
    role = get_role(session, role_id)
    dim = session.get(AuthDimensionType, dimension_type_id)
    if dim is None:
        raise BindingError("DIMENSION_NOT_FOUND", "Dimension type not found", 404)
    for value in values:
        validate_dimension_value(session, dim, value)
    session.query(AuthRoleDimensionValue).filter_by(
        role_id=role.id, dimension_type_id=dimension_type_id
    ).delete()
    for value in values:
        session.add(
            AuthRoleDimensionValue(
                role_id=role.id, dimension_type_id=dimension_type_id, value=value
            )
        )
    session.commit()


def replace_role_dimension_groups(
    session: Session,
    role_id: uuid.UUID,
    group_ids: list[uuid.UUID],
    *,
    actor_roles: list[str],
) -> None:
    assert_binding_admin(actor_roles)
    role = get_role(session, role_id)
    for group_id in group_ids:
        group = session.get(AuthDimensionGroup, group_id)
        if group is None:
            raise BindingError("GROUP_NOT_FOUND", "Group not found", 404)
    session.query(AuthRoleDimensionGroup).filter_by(role_id=role.id).delete()
    for group_id in group_ids:
        session.add(AuthRoleDimensionGroup(role_id=role.id, group_id=group_id))
    session.commit()
