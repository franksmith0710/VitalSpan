from __future__ import annotations

import time
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.query.schemas import ExecuteRequest, ExecuteResponse, QueryError
from app.query.service import execute_query
from app.query.sql_parameters import inject_sql_parameters
from app.reports.engine.errors import ReportEngineError
from app.reports.extension.schemas import ExtensionConfigOut, MetricAdjustment


def build_metric_sql(metric: MetricAdjustment, parameters: dict[str, Any]) -> str:
    base = metric.expression or f"SELECT {metric.key} AS value"
    str_params = {k: str(v) for k, v in (parameters or {}).items()}
    return inject_sql_parameters(base, str_params)


def execute_section(
    db: Session,
    user: UserContext,
    data_source_id: uuid.UUID,
    sql: str,
    *,
    limit: int = 100,
) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        result: ExecuteResponse = execute_query(
            db,
            user,
            ExecuteRequest(
                dataSourceId=data_source_id,
                mode="sql",
                sql=sql,
                limit=limit,
                rls={"enabled": False},
            ),
        )
    except QueryError as exc:
        raise ReportEngineError("RPT_ENGINE_QUERY_FAILED", exc.message, exc.status) from exc
    elapsed_ms = (time.perf_counter() - started) * 1000
    return {
        "columns": result.columns,
        "rows": result.rows,
        "elapsedMs": round(elapsed_ms, 2),
    }


def build_sections_from_extension(
    db: Session,
    user: UserContext,
    ext: ExtensionConfigOut,
    data_source_id: uuid.UUID,
    parameters: dict[str, Any],
) -> tuple[list[dict[str, Any]], float]:
    sections: list[dict[str, Any]] = []
    total_ms = 0.0
    for metric in ext.metrics:
        if not metric.visible:
            continue
        sql = build_metric_sql(metric, parameters)
        payload = execute_section(db, user, data_source_id, sql)
        total_ms += float(payload["elapsedMs"])
        kind = "chart" if metric.compare_mode in {"yoy", "mom"} else "table"
        section: dict[str, Any] = {
            "kind": kind,
            "columns": payload["columns"],
            "rows": payload["rows"],
            "metricKey": metric.key,
            "placeholder": False,
        }
        if kind == "chart":
            section["chartType"] = "line" if metric.compare_mode == "mom" else "bar"
        sections.append(section)
    return sections, total_ms
