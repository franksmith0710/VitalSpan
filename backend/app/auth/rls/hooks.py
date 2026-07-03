from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.auth.rls.predicate import build_org_rls_fragment, resolve_user_org_node_ids


def get_query_rls_fragment(
    session: Session,
    user: UserContext,
    *,
    table_alias: str = "t",
    org_column: str = "org_node_id",
) -> str:
    org_ids = resolve_user_org_node_ids(session, uuid.UUID(user.id))
    return build_org_rls_fragment(org_ids, column=org_column, alias=table_alias)
