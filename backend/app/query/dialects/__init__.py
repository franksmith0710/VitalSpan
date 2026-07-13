from __future__ import annotations

from app.query.capabilities import resolve_sql_dialect_type
from app.query.dialects.base import SqlDialect, UnsupportedDialectError
from app.query.dialects.clickhouse import ClickHouseDialect
from app.query.dialects.mysql import MySqlDialect
from app.query.dialects.oracle import OracleDialect
from app.query.dialects.postgres import PostgresDialect
from app.query.dialects.sqlite import SqliteDialect
from app.query.dialects.sqlserver import SqlServerDialect

_REGISTRY: dict[str, SqlDialect] = {
    "mysql": MySqlDialect(),
    "postgresql": PostgresDialect(),
    "clickhouse": ClickHouseDialect(),
    "sqlite": SqliteDialect(),
    "sqlserver": SqlServerDialect(),
    "oracle": OracleDialect(),
}


def get_sql_dialect(connector_type: str) -> SqlDialect:
    resolved = resolve_sql_dialect_type(connector_type)
    dialect = _REGISTRY.get(resolved)
    if dialect is None:
        raise UnsupportedDialectError(connector_type)
    return dialect


__all__ = [
    "SqlDialect",
    "UnsupportedDialectError",
    "MySqlDialect",
    "PostgresDialect",
    "ClickHouseDialect",
    "SqliteDialect",
    "SqlServerDialect",
    "OracleDialect",
    "get_sql_dialect",
]
