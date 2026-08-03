from __future__ import annotations

from typing import Any

import pymysql

from app.ingestion.models import INGESTION_MAX_ROWS, SyncJob, decrypt_password
from app.query.rls.guard import validate_identifier


def validate_sync_table_names(source_table: str, target_table: str) -> None:
    validate_identifier(source_table)
    validate_identifier(target_table)


def _max_watermark(rows: list[dict[str, Any]], column: str) -> str | None:
    if not rows:
        return None
    values = [row.get(column) for row in rows if row.get(column) is not None]
    if not values:
        return None
    return str(max(values, key=lambda v: str(v)))


def compute_next_watermark(job: SyncJob, rows: list[dict[str, Any]]) -> str | None:
    if job.sync_mode != "incremental" or not job.incremental_column:
        return None
    candidate = _max_watermark(rows, job.incremental_column)
    if candidate is None:
        return job.last_watermark
    if job.last_watermark is None:
        return candidate
    return candidate if str(candidate) > str(job.last_watermark) else job.last_watermark


def fetch_mysql_rows(job: SyncJob) -> list[dict[str, Any]]:
    validate_sync_table_names(job.source_table, job.target_table)
    conn = pymysql.connect(
        host=job.source_host,
        port=job.source_port,
        user=job.source_username,
        password=decrypt_password(job.source_password_encrypted),
        database=job.source_database,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
        read_timeout=60,
    )
    table = job.source_table
    try:
        with conn.cursor() as cur:
            if job.sync_mode == "incremental" and job.incremental_column:
                inc = job.incremental_column
                if job.last_watermark:
                    cur.execute(
                        f"SELECT * FROM `{table}` WHERE `{inc}` > %s "
                        f"ORDER BY `{inc}` LIMIT %s",
                        (job.last_watermark, INGESTION_MAX_ROWS),
                    )
                else:
                    cur.execute(
                        f"SELECT * FROM `{table}` WHERE `{inc}` IS NOT NULL "
                        f"ORDER BY `{inc}` LIMIT %s",
                        (INGESTION_MAX_ROWS,),
                    )
            else:
                cur.execute(f"SELECT * FROM `{table}` LIMIT %s", (INGESTION_MAX_ROWS,))
            return list(cur.fetchall())
    finally:
        conn.close()
