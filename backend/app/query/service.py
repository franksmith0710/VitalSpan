from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.auth.resources.service import VisibilityError
from app.auth.rls.predicate import RlsConfigError
from app.core.config import get_settings
from app.core.logging import trace_id_var
from app.datasources.acl import assert_visible
from app.query.executor import QueryExecutor
from app.query.schemas import ExecuteRequest, ExecuteResponse, QueryError


_executor = QueryExecutor()


def _effective_limit(request: ExecuteRequest, binding_default: int | None = None) -> int:
    settings = get_settings()
    if request.limit is not None:
        return min(request.limit, settings.query_default_limit)
    if binding_default is not None:
        return min(binding_default, settings.query_default_limit)
    return settings.query_default_limit


def _rls_enabled(request: ExecuteRequest) -> bool:
    if request.rls.enabled:
        return True
    if get_settings().vitalspan_env != "development":
        raise QueryError("RLS_CONFIG_INVALID", "Disabling RLS is only allowed in development", 400)
    return False


def execute_query(session: Session, user: UserContext, payload: ExecuteRequest) -> ExecuteResponse:
    from app.query.binding_service import resolve_binding_execute

    if payload.binding_id is not None:
        resolved = resolve_binding_execute(session, user.roles, payload.binding_id)
        data_source_id = resolved["data_source_id"]
        mode = resolved["mode"]
        sql = resolved.get("sql")
        schema = resolved.get("schema_name")
        table = resolved.get("table_name")
        limit = _effective_limit(payload, resolved.get("default_limit"))
    else:
        data_source_id = payload.data_source_id  # type: ignore[assignment]
        mode = payload.mode  # type: ignore[assignment]
        sql = payload.sql
        schema = payload.schema
        table = payload.table
        limit = _effective_limit(payload)

    try:
        assert_visible(session, user.roles, data_source_id)
    except VisibilityError as exc:
        raise QueryError(exc.code, exc.message, exc.status) from exc

    apply_rls = _rls_enabled(payload)
    rls_config = {
        "table_alias": payload.rls.table_alias,
        "org_column": payload.rls.org_column,
    }
    try:
        if mode == "sql":
            result = _executor.execute_sql(
                session, user, data_source_id, sql or "", limit=limit, offset=payload.offset,
                rls_config=rls_config, apply_rls=apply_rls,
            )
        else:
            result = _executor.execute_table(
                session, user, data_source_id, schema or "", table or "",
                limit=limit, offset=payload.offset, rls_config=rls_config, apply_rls=apply_rls,
            )
    except RlsConfigError as exc:
        raise QueryError("RLS_CONFIG_INVALID", str(exc), 400) from exc

    return ExecuteResponse(
        columns=result.columns,
        rows=result.rows,
        row_count=result.row_count,
        truncated=result.truncated,
        trace_id=trace_id_var.get() or "",
    )
