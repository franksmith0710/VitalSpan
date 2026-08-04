"""同步源连接器能力：与连接管理目录对齐，区分可同步 / 仅元数据 / 仅出图。"""

from __future__ import annotations

from app.query.capabilities import (
    is_native_query_capable,
    is_query_capable,
    is_sql_query_capable,
    resolve_sql_dialect_type,
)

# 已落地 fetch 实现的 SQL 方言（其余 SQL 类型 API 可选但运行时报友好错误）
_SYNC_SQL_FETCH_DIALECTS = frozenset({"mysql", "postgresql"})

# 已落地 fetch 的 Native 类型
_SYNC_NATIVE_FETCH_TYPES = frozenset({
    "csv",
    "excel",
    "mongodb",
    "elasticsearch",
    "opensearch",
    "rest_api",
})


def is_sync_source_capable(connector_type: str) -> bool:
    """与连接管理「可查询」目录一致：SQL 表源 + Native 源。"""
    return is_query_capable(connector_type)


def resolve_sync_fetch_mode(connector_type: str) -> str | None:
    if is_sql_query_capable(connector_type):
        return "sql"
    if is_native_query_capable(connector_type):
        return "native"
    return None


def resolve_sql_dialect_for_sync(connector_type: str) -> str:
    return resolve_sql_dialect_type(connector_type)


def is_sync_fetch_implemented(connector_type: str) -> bool:
    mode = resolve_sync_fetch_mode(connector_type)
    if mode == "sql":
        return resolve_sql_dialect_for_sync(connector_type) in _SYNC_SQL_FETCH_DIALECTS
    if mode == "native":
        return connector_type in _SYNC_NATIVE_FETCH_TYPES
    return False


def sync_fetch_not_implemented_message(connector_type: str) -> str:
    mode = resolve_sync_fetch_mode(connector_type)
    if mode is None:
        return f"连接器「{connector_type}」不支持表级同步，仅可登记连接与浏览元数据"
    if mode == "sql":
        dialect = resolve_sql_dialect_for_sync(connector_type)
        return f"同步拉数暂未实现 {connector_type}（SQL 方言 {dialect}），请优先使用 MySQL / PostgreSQL 系或关注后续版本"
    return f"同步拉数暂未实现 Native 源「{connector_type}」"
