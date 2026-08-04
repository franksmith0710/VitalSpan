from __future__ import annotations

from typing import Any

import psycopg
import pymysql
from psycopg.rows import dict_row

from app.ingestion.models import INGESTION_MAX_ROWS, SyncJob, decrypt_password
from app.query.rls.guard import validate_identifier


def _validate_sync_table_names(source_table: str, target_table: str) -> None:
    validate_identifier(source_table)
    validate_identifier(target_table)


def _fetch_mysql_dialect_rows(job: SyncJob) -> list[dict[str, Any]]:
    _validate_sync_table_names(job.source_table, job.target_table)
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


def _fetch_postgresql_rows(job: SyncJob) -> list[dict[str, Any]]:
    _validate_sync_table_names(job.source_table, job.target_table)
    conn = psycopg.connect(
        host=job.source_host,
        port=job.source_port,
        dbname=job.source_database,
        user=job.source_username,
        password=decrypt_password(job.source_password_encrypted),
        connect_timeout=10,
    )
    table = job.source_table
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            if job.sync_mode == "incremental" and job.incremental_column:
                inc = job.incremental_column
                if job.last_watermark:
                    cur.execute(
                        f'SELECT * FROM "{table}" WHERE "{inc}" > %s '
                        f'ORDER BY "{inc}" LIMIT %s',
                        (job.last_watermark, INGESTION_MAX_ROWS),
                    )
                else:
                    cur.execute(
                        f'SELECT * FROM "{table}" WHERE "{inc}" IS NOT NULL '
                        f'ORDER BY "{inc}" LIMIT %s',
                        (INGESTION_MAX_ROWS,),
                    )
            else:
                cur.execute(f'SELECT * FROM "{table}" LIMIT %s', (INGESTION_MAX_ROWS,))
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    finally:
        conn.close()


def fetch_sql_rows(job: SyncJob, dialect: str) -> list[dict[str, Any]]:
    if dialect == "mysql":
        return _fetch_mysql_dialect_rows(job)
    if dialect == "postgresql":
        return _fetch_postgresql_rows(job)
    raise RuntimeError(f"未实现的 SQL 方言拉数: {dialect}")
