from __future__ import annotations

from typing import Any

from app.datasources.credentials import CredentialDecryptError, decrypt_credential
from app.datasources.registry import ConnectorNotFoundError, registry
from app.ingestion.models import INGESTION_MAX_ROWS, SyncJob, decrypt_password
from app.ingestion.sync_source_table import validate_sync_source_table
from app.query.rls.guard import validate_identifier
from app.query.schemas import QueryError


def _rows_to_dicts(columns: list[str], rows: list[list]) -> list[dict[str, Any]]:
    return [dict(zip(columns, row, strict=False)) for row in rows]


def _connector_kwargs(job: SyncJob) -> tuple[Any, dict[str, Any]]:
    try:
        connector = registry.get(job.source_type)
    except ConnectorNotFoundError as exc:
        raise RuntimeError(f"未知连接器类型: {job.source_type}") from exc
    try:
        password = decrypt_password(job.source_password_encrypted)
    except CredentialDecryptError as exc:
        raise RuntimeError("源连接凭证解密失败") from exc
    kwargs = {
        "host": job.source_host,
        "port": job.source_port,
        "database": job.source_database,
        "username": job.source_username,
        "password": password,
    }
    return connector, kwargs


def fetch_native_rows(job: SyncJob) -> list[dict[str, Any]]:
    validate_sync_source_table(job.source_type, job.source_table)
    validate_identifier(job.target_table)
    connector, kwargs = _connector_kwargs(job)
    conn = connector.open_connection(**kwargs)
    try:
        if job.source_type == "mongodb":
            body = {"collection": job.source_table, "database": job.source_database, "filter": {}}
            columns, rows, _ = connector.execute_native_query(
                conn,
                body=body,
                limit=INGESTION_MAX_ROWS,
                offset=0,
                database=job.source_database,
            )
        elif job.source_type in ("csv", "excel"):
            columns, rows, _ = connector.execute_native_query(
                conn,
                body={},
                limit=INGESTION_MAX_ROWS,
                offset=0,
            )
        elif job.source_type == "rest_api":
            path = job.source_table.strip()
            if not path.startswith("/"):
                path = f"/{path}"
            columns, rows, _ = connector.execute_native_query(
                conn,
                body={"path": path},
                limit=INGESTION_MAX_ROWS,
                offset=0,
            )
        elif job.source_type in ("elasticsearch", "opensearch"):
            index = job.source_table
            columns, rows, _ = connector.execute_native_query(
                conn,
                body={},
                index=index,
                limit=INGESTION_MAX_ROWS,
            )
        elif job.source_type == "influxdb":
            columns, rows, _ = connector.execute_native_query(
                conn,
                body={"measurement": job.source_table, "bucket": job.source_database},
                limit=INGESTION_MAX_ROWS,
                offset=0,
                database=job.source_database,
            )
        else:
            raise RuntimeError(f"未实现的 Native 同步源: {job.source_type}")
        return _rows_to_dicts(columns, rows)
    except QueryError as exc:
        raise RuntimeError(exc.message) from exc
    finally:
        close = getattr(conn, "close", None)
        if callable(close):
            close()
