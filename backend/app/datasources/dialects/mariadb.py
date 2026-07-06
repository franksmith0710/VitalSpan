from __future__ import annotations

import time
from typing import Any

import pymysql.err

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult
from app.datasources.dialects.errors import map_mysql_operational_error
from app.datasources.dialects.mysql import MysqlConnector


class MariadbConnector:
    type = "mariadb"
    category = "relational"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "MariaDB"

    def __init__(self) -> None:
        self._inner = MysqlConnector()

    def test_connection(self, **kwargs) -> TestConnectionResult:
        started = time.perf_counter()
        try:
            connection = self._inner.open_connection(**kwargs)
            try:
                connection.ping(reconnect=False)
            finally:
                connection.close()
        except pymysql.err.OperationalError as exc:
            code, detail = map_mysql_operational_error(exc)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(
                ok=False,
                message=f"[{code}] {detail}",
                latency_ms=latency_ms,
                code=code,
            )
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=str(exc), latency_ms=latency_ms, code=None)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def open_connection(self, **kwargs) -> Any:
        return self._inner.open_connection(**kwargs)

    def list_schemas(self, connection: Any) -> list[SchemaInfo]:
        return self._inner.list_schemas(connection)

    def list_tables(self, connection: Any, schema: str) -> list[TableInfo]:
        return self._inner.list_tables(connection, schema)

    def list_columns(self, connection: Any, schema: str, table: str) -> list[ColumnInfo]:
        return self._inner.list_columns(connection, schema, table)
