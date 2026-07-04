from __future__ import annotations

import time
from typing import Any

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult

HIVE_CONN_REFUSED = "HIVE_CONN_REFUSED"
HIVE_AUTH_FAILED = "HIVE_AUTH_FAILED"
HIVE_TIMEOUT = "HIVE_TIMEOUT"
HIVE_UNKNOWN_DATABASE = "HIVE_UNKNOWN_DATABASE"
HIVE_UNKNOWN = "HIVE_UNKNOWN"

_SYSTEM_SCHEMAS = frozenset({"information_schema"})


def _map_hive_error(exc: Exception) -> tuple[str, str]:
    detail = str(exc)
    lowered = detail.lower()
    if "auth" in lowered or "denied" in lowered or "password" in lowered:
        return HIVE_AUTH_FAILED, detail
    if "timeout" in lowered or "timed out" in lowered:
        return HIVE_TIMEOUT, detail
    if "refused" in lowered or "could not connect" in lowered:
        return HIVE_CONN_REFUSED, detail
    if "database" in lowered and "not" in lowered:
        return HIVE_UNKNOWN_DATABASE, detail
    return HIVE_UNKNOWN, detail


class HiveConnector:
    type = "hive"
    category = "lake"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "Apache Hive"

    def _connect(self, **kwargs: Any) -> Any:
        import pyhive.hive

        host = kwargs["host"]
        port = kwargs.get("port", 10000)
        username = kwargs["username"]
        password = kwargs["password"]
        database = kwargs.get("database") or "default"
        return pyhive.hive.connect(
            host=host,
            port=port,
            username=username,
            password=password,
            database=database,
        )

    def open_connection(self, **kwargs: Any) -> Any:
        return self._connect(**kwargs)

    def test_connection(self, **kwargs: Any) -> TestConnectionResult:
        started = time.perf_counter()
        try:
            connection = self._connect(**kwargs)
            try:
                cursor = connection.cursor()
                cursor.execute("SELECT 1")
            finally:
                connection.close()
        except Exception as exc:
            code, detail = _map_hive_error(exc)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(
                ok=False,
                message=f"[{code}] {detail}",
                latency_ms=latency_ms,
                code=code,
            )
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def list_schemas(self, connection: Any) -> list[SchemaInfo]:
        cursor = connection.cursor()
        cursor.execute("SHOW DATABASES")
        rows = cursor.fetchall()
        return [
            SchemaInfo(name=row[0])
            for row in rows
            if row and row[0] not in _SYSTEM_SCHEMAS
        ]

    def list_tables(self, connection: Any, schema: str) -> list[TableInfo]:
        if not schema.strip():
            return []
        cursor = connection.cursor()
        cursor.execute(f"SHOW TABLES IN {schema}")
        rows = cursor.fetchall()
        return [TableInfo(name=row[0], type="TABLE") for row in rows if row]

    def list_columns(self, connection: Any, schema: str, table: str) -> list[ColumnInfo]:
        if not schema.strip() or not table.strip():
            return []
        cursor = connection.cursor()
        cursor.execute(f"DESCRIBE {schema}.{table}")
        rows = cursor.fetchall()
        columns: list[ColumnInfo] = []
        for row in rows:
            if not row or not row[0] or str(row[0]).startswith("#"):
                continue
            columns.append(ColumnInfo(name=str(row[0]), data_type=str(row[1]), nullable=True))
        return columns
