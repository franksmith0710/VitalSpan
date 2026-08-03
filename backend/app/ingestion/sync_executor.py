from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.ingestion.etl_rules import apply_rules
from app.ingestion.models import EtlRuleSet, SyncJob, SyncRun, get_meta_session
from app.ingestion.sync_fetch import compute_next_watermark, fetch_mysql_rows, validate_sync_table_names
from app.ingestion.sync_write import write_analytics

__all__ = ["run_job", "validate_sync_table_names", "INGESTION_MAX_ROWS"]

from app.ingestion.models import INGESTION_MAX_ROWS  # noqa: E402


def _update_run(db: Session, run: SyncRun, **fields: Any) -> None:
    for key, value in fields.items():
        setattr(run, key, value)
    db.commit()


def run_job(job_id: uuid.UUID, trace_id: str, *, run_id: uuid.UUID | None = None, attempt: int = 0) -> uuid.UUID:
    db = get_meta_session()
    if run_id is None:
        run = SyncRun(job_id=job_id, status="running", trace_id=trace_id, retry_count=attempt)
        db.add(run)
        db.commit()
        db.refresh(run)
        run_id = run.id
    else:
        run = db.get(SyncRun, run_id)
        if run is None:
            db.close()
            raise ValueError("run not found")
    job = db.get(SyncJob, job_id)
    if job is None:
        _update_run(db, run, status="failed", finished_at=datetime.now(timezone.utc), error_message="任务不存在")
        db.close()
        return run_id
    rules_row = db.scalar(select(EtlRuleSet).where(EtlRuleSet.job_id == job_id))
    rules = rules_row.rules if rules_row else []
    try:
        if not get_settings().analytics_database_url:
            raise RuntimeError("ANALYTICS_DB_NOT_CONFIGURED")
        if job.source_type != "mysql":
            raise RuntimeError("M1B 仅支持 mysql 源")
        raw = fetch_mysql_rows(job)
        cleaned = apply_rules(raw, rules)
        count = write_analytics(job, cleaned)
        next_watermark = compute_next_watermark(job, cleaned)
        if next_watermark is not None:
            job.last_watermark = next_watermark
        _update_run(
            db,
            run,
            status="succeeded",
            finished_at=datetime.now(timezone.utc),
            rows_synced=count,
            error_message=None,
        )
        db.commit()
    except Exception as exc:  # noqa: BLE001 — 记录用户可读摘要
        if attempt < 1:
            _update_run(db, run, retry_count=attempt + 1)
            db.close()
            run_job(job_id, trace_id, run_id=run_id, attempt=attempt + 1)
            return run_id
        _update_run(
            db,
            run,
            status="failed",
            finished_at=datetime.now(timezone.utc),
            error_message=str(exc)[:500],
        )
    finally:
        db.close()
    return run_id
