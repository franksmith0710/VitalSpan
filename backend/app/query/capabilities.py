"""Connector query capability — SQL dialect aliases and query-capable registry."""

from __future__ import annotations

# CONN-Q-01~06 → mysql；CONN-Q-07~09、CONN-Q-19 → postgresql
CONNECTOR_SQL_DIALECT_ALIASES: dict[str, str] = {
    "mariadb": "mysql",
    "tidb": "mysql",
    "starrocks": "mysql",
    "doris": "mysql",
    "oceanbase": "mysql",
    "gbase": "mysql",
    "kingbase": "postgresql",
    "gaussdb": "postgresql",
    "redshift": "postgresql",
    "timescaledb": "postgresql",
    "dm": "oracle",
    "impala": "hive",
    "presto": "trino",
}

_DIRECT_SQL_DIALECTS = frozenset({
    "mysql",
    "postgresql",
    "clickhouse",
    "sqlite",
    "sqlserver",
    "oracle",
    "hive",
    "trino",
    "db2",
    "tdengine",
})
# Phase 1 (DE/SS 对标): file/api 源已有 execute_native_query，接线即可查
NATIVE_QUERY_CAPABLE = frozenset({
    "mongodb",
    "elasticsearch",
    "opensearch",
    "csv",
    "excel",
    "rest_api",
    "influxdb",
})
# Native 执行器需传递 offset 的类型（非 search index 路径）
NATIVE_OFFSET_TYPES = frozenset({"mongodb", "csv", "excel", "rest_api"})


def resolve_sql_dialect_type(connector_type: str) -> str:
    return CONNECTOR_SQL_DIALECT_ALIASES.get(connector_type, connector_type)


def is_sql_query_capable(connector_type: str) -> bool:
    return resolve_sql_dialect_type(connector_type) in _DIRECT_SQL_DIALECTS


def is_native_query_capable(connector_type: str) -> bool:
    return connector_type in NATIVE_QUERY_CAPABLE


def is_query_capable(connector_type: str) -> bool:
    return is_sql_query_capable(connector_type) or is_native_query_capable(connector_type)


def resolve_query_mode_for_connector(connector_type: str) -> str | None:
    if is_native_query_capable(connector_type):
        return "native"
    if is_sql_query_capable(connector_type):
        return "sql"
    return None
