from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AuthDimensionType, AuthOrgNode, AuthRole


class RlsDenied(Exception):
    def __init__(self, message: str = "RLS denied") -> None:
        self.message = message
        super().__init__(message)


def _expand_org_subtree(session: Session, root_ids: set[uuid.UUID]) -> set[uuid.UUID]:
    if not root_ids:
        return set()
    nodes = list(session.scalars(select(AuthOrgNode)))
    allowed: set[uuid.UUID] = set()
    for node in nodes:
        for root in root_ids:
            root_node = session.get(AuthOrgNode, root)
            if root_node is None:
                continue
            if node.id == root or node.path.startswith(f"{root_node.path}/"):
                allowed.add(node.id)
    return allowed


def resolve_user_org_node_ids(session: Session, user_id: uuid.UUID) -> set[uuid.UUID]:
    from app.auth.deps import resolve_user_roles
    from app.auth.rls.bindings.service import resolve_effective_values

    role_codes = resolve_user_roles(str(user_id))
    roles = list(session.scalars(select(AuthRole).where(AuthRole.code.in_(role_codes))))
    org_types = list(
        session.scalars(select(AuthDimensionType).where(AuthDimensionType.org_dimension.is_(True)))
    )
    raw: set[str] = set()
    for role in roles:
        for org_type in org_types:
            raw.update(resolve_effective_values(session, role.id, org_type.id))
    root_ids = {uuid.UUID(v) for v in raw}
    return _expand_org_subtree(session, root_ids)


def build_org_rls_fragment(
    org_ids: set[uuid.UUID],
    *,
    column: str = "org_node_id",
    alias: str = "t",
) -> str:
    if not org_ids:
        return "1=0"
    literals = ", ".join(f"'{oid}'" for oid in sorted(org_ids))
    return f"{alias}.{column} IN ({literals})"
