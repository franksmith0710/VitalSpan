from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import pymysql
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.ingestion.etl_rules import apply_rules
from app.ingestion.models import (
    INGESTION_MAX_ROWS,
    EtlRuleSet,
    SyncJob,
    SyncRun,
    decrypt_password,
    get_meta_session,
)


def _fetch_mysql_rows(job: SyncJob) -> list[dict[str, Any]]:
    conn = pymysql.connect(
        host=job.source_host,
        port=job.source_port,
        user=job.source_username,
        password=decrypt_password(job.source_password_encrypted),
        database=job.source_database,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM `{job.source_table}` LIMIT %s", (INGESTION_MAX_ROWS,))
            return list(cur.fetchall())
    finally:
        conn.close()


def _write_analytics(job: SyncJob, rows: list[dict[str, Any]]) -> int:
    settings = get_settings()
    if not settings.analytics_database_url:
        raise RuntimeError("ANALYTICS_DB_NOT_CONFIGURED")
    engine = create_engine(settings.analytics_database_url, pool_pre_ping=True)
    if not rows:
        return 0
    columns = list(rows[0].keys())
    col_defs = ", ".join(f'"{c}" TEXT' for c in columns)
    placeholders = ", ".join(f":{c}" for c in columns)
    insert_sql = text(f'INSERT INTO "{job.target_table}" ({", ".join(columns)}) VALUES ({placeholders})')
    with engine.begin() as conn:
        conn.execute(text(f'CREATE TABLE IF NOT EXISTS "{job.target_table}" ({col_defs})'))
        conn.execute(text(f'TRUNCATE TABLE "{job.target_table}"'))
        for row in rows:
            conn.execute(insert_sql, row)
    return len(rows)


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
        raw = _fetch_mysql_rows(job)
        cleaned = apply_rules(raw, rules)
        count = _write_analytics(job, cleaned)
        _update_run(
            db,
            run,
            status="succeeded",
            finished_at=datetime.now(timezone.utc),
            rows_synced=count,
            error_message=None,
        )
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
