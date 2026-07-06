from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard.theme.errors import ThemeAnalysisError
from app.dashboard.theme.schemas import EntityThemeConfig
from app.dashboard.theme import service as theme_service
from app.metadata.physical import service as physical_service
from app.reports.engine import execute as engine_execute


def build_drill_query(config: EntityThemeConfig, dimension_id: str, filters: dict[str, Any] | None) -> str:
    dim = next((d for d in config.dimensions if d.dimension_id == dimension_id), None)
    if dim is None:
        raise ThemeAnalysisError("DASH_THEME_DIMENSION_UNKNOWN", f"unknown dimensionId={dimension_id}", 422)
    col = dimension_id
    where = ""
    if filters:
        clauses = [f"{k} = '{v}'" for k, v in filters.items() if isinstance(v, (str, int, float))]
        if clauses:
            where = " WHERE " + " AND ".join(clauses)
    return f"SELECT {col}, COUNT(*) AS cnt FROM {{table}}{where} GROUP BY {col}"


def execute_theme_drill(
    db: Session,
    user: UserContext,
    ref_type: str,
    ref_id: uuid.UUID,
    dimension_id: str,
    filters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from app.dashboard.theme.acl import assert_theme_action

    assert_theme_action(user, "read")
    try:
        config = theme_service.get_theme_config(db, ref_type, ref_id)
    except ThemeAnalysisError as exc:
        if exc.code == "CONFIG_NOT_FOUND":
            raise ThemeAnalysisError("CONFIG_NOT_FOUND", exc.message, 404) from exc
        raise
    except Exception as exc:
        from app.query.config_store.schemas import ConfigError

        if isinstance(exc, ConfigError) and exc.code == "CONFIG_NOT_FOUND":
            raise ThemeAnalysisError("CONFIG_NOT_FOUND", exc.message, 404) from exc
        raise
    sql_template = build_drill_query(config, dimension_id, filters)
    listed = physical_service.list_physical_tables(entity_type_code=config.entity_type, limit=1, offset=0)
    if not listed.items:
        raise ThemeAnalysisError("DASH_THEME_ENTITY_NOT_READY", "no physical table for entityType", 404)
    pt = listed.items[0]
    table_ref = (
        f"{pt.source_schema}.{pt.source_table}"
        if pt.source_schema and pt.source_table
        else pt.table_fqn.split(".", 1)[-1]
    )
    sql = sql_template.format(table=table_ref)
    payload = engine_execute.execute_section(db, user, pt.data_source_id, sql, limit=100)
    return {"columns": payload["columns"], "rows": payload["rows"]}
