from __future__ import annotations

from app.query.dialects.base import SqlDialect, UnsupportedDialectError
from app.query.dialects.clickhouse import ClickHouseDialect
from app.query.dialects.mysql import MySqlDialect
from app.query.dialects.postgres import PostgresDialect

_REGISTRY: dict[str, SqlDialect] = {
    "mysql": MySqlDialect(),
    "postgresql": PostgresDialect(),
    "clickhouse": ClickHouseDialect(),
}


def get_sql_dialect(connector_type: str) -> SqlDialect:
    dialect = _REGISTRY.get(connector_type)
    if dialect is None:
        raise UnsupportedDialectError(connector_type)
    return dialect


__all__ = [
    "SqlDialect",
    "UnsupportedDialectError",
    "MySqlDialect",
    "PostgresDialect",
    "ClickHouseDialect",
    "get_sql_dialect",
]
