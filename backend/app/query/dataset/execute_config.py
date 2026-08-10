from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.core.config import get_settings
from app.core.logging import trace_id_var
from app.datasources.acl import assert_visible
from app.query.config_store.access import assert_config_readable
from app.query.config_store.schemas import ConfigError, DatasetQueryConfigPayload
from app.query.config_store.service import get_config_by_id
from app.query.dataset.schemas import DatasetExecuteRequest, DatasetExecuteResponse
from app.query.executor import QueryExecutor
from app.query.readonly import assert_safe_sql_parameters
from app.query.schemas import QueryError
from app.query.translator.from_config import translate_from_config_record
from app.query.translator.schemas import TranslateError

_executor = QueryExecutor()
_FORBIDDEN_PARAM_KEYS = frozenset({"__proto__", "_sql"})


def _merge_parameters(translated: dict[str, object], override: dict[str, object]) -> dict[str, object]:
    merged = dict(translated)
    merged.update(override)
    for key in merged:
        if key in _FORBIDDEN_PARAM_KEYS or key.startswith("__"):
            raise QueryError("QUERY_DATASET_PLAN_INVALID_PARAMS", "Forbidden parameter key", 422)
    assert_safe_sql_parameters(merged)
    return merged


def execute_dataset_from_config(
    session: Session,
    user: UserContext,
    req: DatasetExecuteRequest,
) -> DatasetExecuteResponse:
    try:
        record = get_config_by_id(session, req.config_id)
        assert_config_readable(user, record)
    except ConfigError as exc:
        raise QueryError(exc.code, exc.message, exc.status) from exc

    payload = DatasetQueryConfigPayload.model_validate(record.payload)
    if payload.data_source_id != req.data_source_id:
        raise QueryError(
            "QUERY_DATASET_CONFIG_MISMATCH",
            "config payload dataSourceId does not match request",
            422,
        )

    try:
        assert_visible(session, user.roles, req.data_source_id)
    except Exception as exc:
        from app.auth.resources.service import VisibilityError

        if isinstance(exc, VisibilityError):
            raise QueryError(exc.code, exc.message, exc.status) from exc
        raise

    try:
        translated = translate_from_config_record(record)
    except TranslateError as exc:
        raise QueryError(exc.code, exc.message, exc.status) from exc
    parameters = _merge_parameters(translated.parameters, req.parameters)

    sql = translated.sql
    from app.metadata.dataset import service as dataset_service
    from app.metadata.dataset.computed_sql import augment_select_sql

    bound = dataset_service.find_dataset_by_bound_config(req.config_id)
    if bound is not None and bound.computed_fields:
        allowed = set(payload.columns) | {t.name for t in bound.tables}
        sql = augment_select_sql(sql, bound.computed_fields, allowed)

    settings = get_settings()
    limit = min(req.limit or settings.query_default_limit, settings.query_default_limit)
    apply_rls = req.rls.enabled
    if not apply_rls and settings.vitalspan_env != "development":
        raise QueryError("RLS_CONFIG_INVALID", "Disabling RLS is only allowed in development", 400)

    rls_config = {"table_alias": req.rls.table_alias, "org_column": req.rls.org_column}
    result = _executor.execute_sql(
        session,
        user,
        req.data_source_id,
        sql,
        limit=limit,
        offset=req.offset,
        rls_config=rls_config,
        apply_rls=apply_rls,
        parameters=parameters,
        skip_wrap_limit=True,
    )
    return DatasetExecuteResponse(
        configId=req.config_id,
        configRevision=record.revision,
        columns=result.columns,
        rows=result.rows,
        rowCount=result.row_count,
        truncated=result.truncated,
        traceId=trace_id_var.get() or "",
    )
