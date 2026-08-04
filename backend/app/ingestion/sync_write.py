from __future__ import annotations

from functools import lru_cache
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import get_settings
from app.ingestion.models import SyncJob

_ANALYTICS_STATEMENT_TIMEOUT_MS = 60_000


@lru_cache
def get_analytics_engine() -> Engine:
    settings = get_settings()
    url = settings.analytics_database_url
    if not url:
        raise RuntimeError("ANALYTICS_DB_NOT_CONFIGURED")
    return create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5},
        pool_timeout=10,
    )


def _begin_analytics_write():
    engine = get_analytics_engine()
    conn = engine.connect()
    tx = conn.begin()
    conn.execute(text(f"SET LOCAL statement_timeout = '{_ANALYTICS_STATEMENT_TIMEOUT_MS}'"))
    return conn, tx


def write_analytics_full(job: SyncJob, rows: list[dict[str, Any]]) -> int:
    if not get_settings().analytics_database_url:
        raise RuntimeError("ANALYTICS_DB_NOT_CONFIGURED")
    if not rows:
        return 0
    columns = list(rows[0].keys())
    col_defs = ", ".join(f'"{c}" TEXT' for c in columns)
    placeholders = ", ".join(f":{c}" for c in columns)
    quoted_cols = ", ".join(f'"{c}"' for c in columns)
    insert_sql = text(
        f'INSERT INTO "{job.target_table}" ({quoted_cols}) VALUES ({placeholders})',
    )
    conn, tx = _begin_analytics_write()
    try:
        conn.execute(text(f'CREATE TABLE IF NOT EXISTS "{job.target_table}" ({col_defs})'))
        conn.execute(text(f'TRUNCATE TABLE "{job.target_table}"'))
        for row in rows:
            conn.execute(insert_sql, row)
        tx.commit()
    except Exception:
        tx.rollback()
        raise
    finally:
        conn.close()
    return len(rows)


def write_analytics_incremental(job: SyncJob, rows: list[dict[str, Any]]) -> int:
    if not get_settings().analytics_database_url:
        raise RuntimeError("ANALYTICS_DB_NOT_CONFIGURED")
    if not rows:
        return 0
    if not job.primary_key:
        raise RuntimeError("增量同步须配置 primary_key")
    pk = job.primary_key
    columns = list(rows[0].keys())
    if pk not in columns:
        raise RuntimeError(f"主键列 {pk} 不在源数据中")
    col_defs = ", ".join(f'"{c}" TEXT' for c in columns)
    quoted_cols = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(f":{c}" for c in columns)
    update_set = ", ".join(f'"{c}"=EXCLUDED."{c}"' for c in columns if c != pk)
    insert_sql = text(
        f'INSERT INTO "{job.target_table}" ({quoted_cols}) VALUES ({placeholders}) '
        f'ON CONFLICT ("{pk}") DO UPDATE SET {update_set}',
    )
    conn, tx = _begin_analytics_write()
    try:
        conn.execute(
            text(
                f'CREATE TABLE IF NOT EXISTS "{job.target_table}" ({col_defs}, '
                f'UNIQUE ("{pk}"))',
            ),
        )
        for row in rows:
            conn.execute(insert_sql, row)
        tx.commit()
    except Exception:
        tx.rollback()
        raise
    finally:
        conn.close()
    return len(rows)


def write_analytics(job: SyncJob, rows: list[dict[str, Any]]) -> int:
    if job.sync_mode == "incremental":
        return write_analytics_incremental(job, rows)
    return write_analytics_full(job, rows)
