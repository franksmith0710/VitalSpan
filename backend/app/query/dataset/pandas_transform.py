"""Dataset 查询时 pandas 清洗（外部源实时直连；同步产物已在 ingestion 过 pandas）。"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.ingestion.analytics_datasource import is_managed_analytics_datasource
from app.ingestion.etl_rules import apply_rules
from app.metadata.dataset.schemas import DatasetItemOut
from app.query.executor import QueryResult
from app.query.schemas import QueryError

logger = logging.getLogger(__name__)

probe_dataset_pandas_budget_ms_limit = 100


@dataclass(frozen=True)
class DatasetPandasProbeResult:
    elapsed_ms: float
    ok: bool


def needs_query_time_pandas(
    db: Session,
    dataset: DatasetItemOut | None,
    data_source_id: uuid.UUID,
) -> bool:
    if dataset is not None and dataset.origin == "sync_job":
        return False
    if is_managed_analytics_datasource(db, data_source_id):
        return False
    return True


def resolve_dataset_transform_rules(_session: Session, _dataset: DatasetItemOut | None) -> list[dict[str, Any]]:
    """首期仅 auto_profile（rules=[]）；二期可挂 Dataset.transform_rules。"""
    return []


def rows_to_records(columns: list[str], rows: list[list[Any]]) -> list[dict[str, Any]]:
    return [dict(zip(columns, row, strict=False)) for row in rows]


def _output_columns(original: list[str], records: list[dict[str, Any]]) -> list[str]:
    if not records:
        return original
    seen: set[str] = set()
    out: list[str] = []
    for rec in records:
        for key in rec:
            if key not in seen:
                seen.add(key)
                out.append(key)
    return out or original


def records_to_query_result(
    columns: list[str],
    records: list[dict[str, Any]],
    *,
    truncated: bool,
) -> QueryResult:
    out_columns = _output_columns(columns, records)
    rows = [[rec.get(col) for col in out_columns] for rec in records]
    return QueryResult(
        columns=out_columns,
        rows=rows,
        row_count=len(rows),
        truncated=truncated,
    )


def apply_query_transform(records: list[dict[str, Any]], rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    try:
        return apply_rules(records, rules)
    except Exception as exc:  # noqa: BLE001 — 用户可读摘要
        raise QueryError("QUERY_DATASET_TRANSFORM_FAILED", str(exc)[:500], 422) from exc


def transform_query_result(
    db: Session,
    dataset: DatasetItemOut | None,
    data_source_id: uuid.UUID,
    result: QueryResult,
    rules: list[dict[str, Any]] | None = None,
) -> QueryResult:
    if not needs_query_time_pandas(db, dataset, data_source_id):
        return result
    records = rows_to_records(result.columns, result.rows)
    rows_in = len(records)
    cleaned = apply_query_transform(records, rules or [])
    rows_out = len(cleaned)
    logger.info(
        "dataset_query_pandas_transform pandasTransform=true rowsIn=%s rowsOut=%s",
        rows_in,
        rows_out,
    )
    return records_to_query_result(result.columns, cleaned, truncated=result.truncated)


def probe_dataset_pandas_budget_ms() -> DatasetPandasProbeResult:
    start = time.perf_counter()
    apply_query_transform(
        [{"product_name": "  A  ", "amount": "12.5", "status": "active"}],
        [],
    )
    elapsed = (time.perf_counter() - start) * 1000
    return DatasetPandasProbeResult(
        elapsed_ms=elapsed,
        ok=elapsed < probe_dataset_pandas_budget_ms_limit,
    )
