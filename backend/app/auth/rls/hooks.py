from __future__ import annotations

import logging
import uuid

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.auth.rls.predicate import (
    build_multi_dimension_rls_fragment,
    build_org_rls_fragment,
    resolve_user_org_node_ids,
    validate_column_name,
)

logger = logging.getLogger(__name__)


def prepare_query_rls(
    session: Session,
    user: UserContext,
    *,
    column_by_dimension_id: dict[uuid.UUID, str] | None = None,
    table_alias: str = "t",
    org_column: str = "org_node_id",
) -> str:
    validate_column_name(table_alias)
    validate_column_name(org_column)
    if column_by_dimension_id is not None:
        for column in column_by_dimension_id.values():
            validate_column_name(column)
    if column_by_dimension_id is None:
        org_ids = resolve_user_org_node_ids(session, uuid.UUID(user.id))
        return build_org_rls_fragment(org_ids, column=org_column, alias=table_alias)
    return build_multi_dimension_rls_fragment(
        session,
        uuid.UUID(user.id),
        column_by_dimension_id=column_by_dimension_id,
        table_alias=table_alias,
    )


def get_query_rls_fragment(
    session: Session,
    user: UserContext,
    *,
    table_alias: str = "t",
    org_column: str = "org_node_id",
) -> str:
    return prepare_query_rls(
        session, user, table_alias=table_alias, org_column=org_column
    )
