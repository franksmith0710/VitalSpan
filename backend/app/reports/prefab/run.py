from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.metadata.physical import service as physical_service
from app.reports.engine import execute as engine_execute
from app.reports.prefab.errors import (
    PrefabError,
    RPT_PREFAB_ENTITY_NOT_READY,
    RPT_PREFAB_NOT_FOUND,
    RPT_PREFAB_RUN_FORBIDDEN,
)
from app.reports.prefab.schemas import PrefabRunIn, PrefabRunOut
from app.reports.prefab import service as prefab_service

_SQL_TEMPLATES: dict[str, str] = {
    "lifecycle": "SELECT status, COUNT(*) AS cnt FROM {table} GROUP BY status",
    "distribution": "SELECT region, COUNT(*) AS cnt FROM {table} GROUP BY region",
    "activity": "SELECT DATE(created_at) AS d, COUNT(*) AS cnt FROM {table} GROUP BY 1 ORDER BY 1",
    "trend": "SELECT DATE(created_at) AS d, COUNT(*) AS cnt FROM {table} GROUP BY 1 ORDER BY 1 LIMIT 30",
}


def _assert_run_access(user: UserContext, allowed_roles: list[str]) -> None:
    if not set(user.roles).intersection(set(allowed_roles)):
        raise PrefabError(RPT_PREFAB_RUN_FORBIDDEN, "role not allowed to run prefab binding", 403)


def _resolve_table(entity_type_code: str) -> tuple[uuid.UUID, str]:
    listed = physical_service.list_physical_tables(entity_type_code=entity_type_code, limit=1, offset=0)
    if not listed.items:
        raise PrefabError(
            RPT_PREFAB_ENTITY_NOT_READY,
            f"no physical table for entityTypeCode={entity_type_code}",
            404,
        )
    pt = listed.items[0]
    if pt.source_schema and pt.source_table:
        table_ref = f"{pt.source_schema}.{pt.source_table}"
    else:
        table_ref = pt.table_fqn.split(".", 1)[-1]
    return pt.data_source_id, table_ref


def _build_sql(analysis_type: str, table_ref: str) -> str:
    template = _SQL_TEMPLATES.get(analysis_type)
    if template is None:
        raise PrefabError("RPT_PREFAB_ANALYSIS_MISMATCH", f"unsupported analysisType={analysis_type}", 422)
    return template.format(table=table_ref)


def run_prefab_binding(db: Session, binding_key: str, payload: PrefabRunIn, user: UserContext) -> PrefabRunOut:
    try:
        binding = prefab_service.get_prefab_binding(binding_key, user)
    except PrefabError as exc:
        if exc.code == RPT_PREFAB_NOT_FOUND:
            raise
        raise
    _assert_run_access(user, binding.allowed_roles)
    ds_id, table_ref = _resolve_table(binding.entity_type_code)
    sql = _build_sql(binding.analysis_type, table_ref)
    section_payload = engine_execute.execute_section(db, user, ds_id, sql, limit=payload.limit)
    chart_type = (
        "bar"
        if binding.analysis_type == "distribution"
        else "line"
        if binding.analysis_type in {"activity", "trend"}
        else None
    )
    section: dict = {
        "kind": "chart" if chart_type else "table",
        "columns": section_payload["columns"],
        "rows": section_payload["rows"],
        "placeholder": False,
    }
    if chart_type:
        section["chartType"] = chart_type
    render_spec = {
        "engineVersion": "1.0",
        "format": "web",
        "sections": [section],
        "parameters": payload.parameters,
    }
    return PrefabRunOut(
        bindingKey=binding.binding_key,
        analysisType=binding.analysis_type,
        renderSpec=render_spec,
        dataSourceId=ds_id,
        status="ready",
    )
