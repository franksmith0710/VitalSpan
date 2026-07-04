from __future__ import annotations

import time
from typing import Any

import psycopg

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult
from app.datasources.dialects.errors import map_kingbase_error
from app.datasources.dialects.postgres import PostgresConnector

KINGBASE_MAX_COLUMNS = 500
KINGBASE_DEFAULT_PORT = 54321


class KingbaseConnector:
    type = "kingbase"
    category = "relational"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "人大金仓 KingbaseES"

    def __init__(self) -> None:
        self._inner = PostgresConnector()

    def test_connection(self, **kwargs) -> TestConnectionResult:
        started = time.perf_counter()
        port = kwargs.get("port", KINGBASE_DEFAULT_PORT)
        conn_kwargs = {**kwargs, "port": port}
        try:
            connection = self._inner.open_connection(**conn_kwargs)
            try:
                connection.execute("SELECT 1")
            finally:
                connection.close()
        except psycopg.Error as exc:
            code, detail = map_kingbase_error(exc)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=f"[{code}] {detail}", latency_ms=latency_ms, code=code)
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=str(exc), latency_ms=latency_ms, code=None)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def open_connection(self, **kwargs) -> Any:
        port = kwargs.get("port", KINGBASE_DEFAULT_PORT)
        return self._inner.open_connection(**{**kwargs, "port": port})

    def list_schemas(self, connection: Any) -> list[SchemaInfo]:
        return self._inner.list_schemas(connection)

    def list_tables(self, connection: Any, schema: str) -> list[TableInfo]:
        return self._inner.list_tables(connection, schema)

    def list_columns(self, connection: Any, schema: str, table: str) -> list[ColumnInfo]:
        cols = self._inner.list_columns(connection, schema, table)
        return cols[:KINGBASE_MAX_COLUMNS]
