from __future__ import annotations

import time
from typing import Any

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult
from app.datasources.dialects.errors import TRINO_DRIVER_MISSING, map_trino_error

TRINO_MAX_COLUMNS = 500


class TrinoConnector:
    type = "trino"
    category = "lake"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "Trino"

    def _connect(self, **kwargs: Any) -> Any:
        try:
            import trino
        except ImportError as exc:
            raise ImportError("trino driver not installed") from exc
        catalog = kwargs.get("database") or kwargs.get("catalog")
        schema = (kwargs.get("connection_options") or {}).get("schema", "default")
        return trino.dbapi.connect(
            host=kwargs["host"],
            port=kwargs.get("port", 8080),
            user=kwargs["username"],
            catalog=catalog,
            schema=schema,
            http_scheme="http",
            auth=None if not kwargs.get("password") else trino.auth.BasicAuthentication(
                kwargs["username"], kwargs["password"],
            ),
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
                cursor.fetchall()
            finally:
                connection.close()
        except ImportError:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(
                ok=False,
                message=f"[{TRINO_DRIVER_MISSING}] trino driver not installed",
                latency_ms=latency_ms,
                code=TRINO_DRIVER_MISSING,
            )
        except Exception as exc:
            code, detail = map_trino_error(exc)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(
                ok=False, message=f"[{code}] {detail}", latency_ms=latency_ms, code=code,
            )
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def list_schemas(self, connection: Any, *, catalog: str | None = None) -> list[SchemaInfo]:
        if not catalog:
            return []
        cursor = connection.cursor()
        cursor.execute(f"SHOW SCHEMAS FROM {catalog}")
        return [SchemaInfo(name=row[0]) for row in cursor.fetchall() if row]

    def list_tables(self, connection: Any, schema: str, *, catalog: str | None = None) -> list[TableInfo]:
        if not catalog or not schema.strip():
            return []
        cursor = connection.cursor()
        cursor.execute(f"SHOW TABLES FROM {catalog}.{schema}")
        rows = cursor.fetchall()
        return [TableInfo(name=row[0], type="table") for row in rows if row] if rows else []

    def list_columns(self, connection: Any, schema: str, table: str, *, catalog: str | None = None) -> list[ColumnInfo]:
        if not catalog or not schema.strip() or not table.strip():
            return []
        cursor = connection.cursor()
        cursor.execute(f"DESCRIBE {catalog}.{schema}.{table}")
        columns = [
            ColumnInfo(name=row[0], data_type=row[1], nullable=True)
            for row in cursor.fetchall()
            if row
        ]
        return columns[:TRINO_MAX_COLUMNS] if len(columns) > TRINO_MAX_COLUMNS else columns
