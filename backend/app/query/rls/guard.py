from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.auth.rls.hooks import prepare_query_rls
from app.auth.rls.predicate import RlsConfigError, validate_column_name
from app.query.rls.region_scope import build_region_scope_fragment, resolve_region_scope_prefix

logger = logging.getLogger(__name__)

_IDENTIFIER_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,63}$")


def validate_identifier(name: str) -> None:
    validate_column_name(name)


def merge_where_clause(sql: str, fragment: str) -> str:
    normalized = sql.strip().rstrip(";")
    upper = normalized.upper()
    if " WHERE " in f" {upper} ":
        return f"{normalized} AND ({fragment})"
    return f"{normalized} WHERE ({fragment})"


ADMIN_BYPASS_ROLES = frozenset({"admin"})


def _should_bypass_rls(user: UserContext) -> bool:
    return bool(ADMIN_BYPASS_ROLES.intersection(user.roles))


def apply_rls_to_sql(
    session: Session,
    user: UserContext,
    sql: str,
    *,
    rls_config: dict[str, Any] | None = None,
) -> str:
    if _should_bypass_rls(user):
        return sql
    cfg = rls_config or {}
    column_by_dimension_id = cfg.get("column_by_dimension_id")
    table_alias = cfg.get("table_alias", "t")
    org_column = cfg.get("org_column", "org_node_id")
    try:
        fragment = prepare_query_rls(
            session,
            user,
            column_by_dimension_id=column_by_dimension_id,
            table_alias=table_alias,
            org_column=org_column,
        )
    except RlsConfigError:
        raise
    except Exception:
        logger.warning("RLS predicate generation failed; degrading to 1=0", exc_info=True)
        fragment = "1=0"

    region_column = cfg.get("region_column")
    if region_column:
        region_fragment = build_region_scope_fragment(
            resolve_region_scope_prefix(user),
            column=str(region_column),
            alias=table_alias,
        )
        if region_fragment:
            fragment = f"({fragment}) AND ({region_fragment})"

    return merge_where_clause(sql, fragment)


def guard_row_access(
    session: Session,
    user: UserContext,
    rows: list[dict],
    org_column: str = "org_node_id",
) -> list[dict]:
    from app.auth.rls.predicate import resolve_user_org_node_ids

    allowed = resolve_user_org_node_ids(session, uuid.UUID(user.id))
    return [r for r in rows if uuid.UUID(str(r[org_column])) in allowed]
