from __future__ import annotations

import time
from typing import Any

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult
from app.datasources.dialects.errors import map_gaussdb_error
from app.datasources.dialects.postgres import PostgresConnector


class GaussdbConnector:
    type = "gaussdb"
    category = "relational"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "GaussDB"

    def __init__(self) -> None:
        self._delegate = PostgresConnector()

    def open_connection(self, **kwargs: Any) -> Any:
        return self._delegate.open_connection(**kwargs)

    def test_connection(self, **kwargs: Any) -> TestConnectionResult:
        started = time.perf_counter()
        try:
            conn = self.open_connection(**kwargs)
            try:
                conn.execute("SELECT 1")
            finally:
                conn.close()
        except Exception as exc:
            code, detail = map_gaussdb_error(exc)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(
                ok=False, message=f"[{code}] {detail}", latency_ms=latency_ms, code=code,
            )
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def list_schemas(self, connection: Any) -> list[SchemaInfo]:
        schemas = self._delegate.list_schemas(connection)
        return schemas or []

    def list_tables(self, connection: Any, schema: str) -> list[TableInfo]:
        if not schema.strip():
            return []
        return self._delegate.list_tables(connection, schema) or []

    def list_columns(self, connection: Any, schema: str, table: str) -> list[ColumnInfo]:
        return self._delegate.list_columns(connection, schema, table)
