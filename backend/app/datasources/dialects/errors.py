from __future__ import annotations

import pymysql.err

MYSQL_CONN_REFUSED = "MYSQL_CONN_REFUSED"
MYSQL_AUTH_FAILED = "MYSQL_AUTH_FAILED"
MYSQL_TIMEOUT = "MYSQL_TIMEOUT"
MYSQL_SSL_ERROR = "MYSQL_SSL_ERROR"
MYSQL_UNKNOWN = "MYSQL_UNKNOWN"
MYSQL_UNKNOWN_DATABASE = "MYSQL_UNKNOWN_DATABASE"

_CODE_MAP: dict[int, str] = {
    2003: MYSQL_CONN_REFUSED,
    1045: MYSQL_AUTH_FAILED,
    2013: MYSQL_TIMEOUT,
    1049: MYSQL_UNKNOWN_DATABASE,
}


def map_mysql_operational_error(exc: pymysql.err.OperationalError) -> tuple[str, str]:
    errno = int(exc.args[0]) if exc.args else 0
    detail = str(exc.args[1]) if len(exc.args) > 1 else str(exc)
    if errno == 2026:
        return MYSQL_SSL_ERROR, detail
    code = _CODE_MAP.get(errno, MYSQL_UNKNOWN)
    if "ssl" in detail.lower():
        code = MYSQL_SSL_ERROR
    return code, detail


PG_CONN_REFUSED = "PG_CONN_REFUSED"
PG_AUTH_FAILED = "PG_AUTH_FAILED"
PG_TIMEOUT = "PG_TIMEOUT"
PG_UNKNOWN_DATABASE = "PG_UNKNOWN_DATABASE"
PG_SSL_ERROR = "PG_SSL_ERROR"
PG_UNKNOWN = "PG_UNKNOWN"

_SSL_MODE_TO_PG = {
    "disabled": "disable",
    "preferred": "prefer",
    "required": "require",
}


def pg_sslmode(ssl_mode: str) -> str:
    return _SSL_MODE_TO_PG.get(ssl_mode, "prefer")


def map_postgres_operational_error(exc: Exception) -> tuple[str, str]:
    detail = str(exc)
    sqlstate = getattr(exc, "sqlstate", None) or getattr(exc, "pgcode", None)
    if sqlstate == "28P01":
        return PG_AUTH_FAILED, detail
    if sqlstate == "3D000":
        return PG_UNKNOWN_DATABASE, detail
    lowered = detail.lower()
    if "timeout" in lowered or "timed out" in lowered:
        return PG_TIMEOUT, detail
    if "ssl" in lowered:
        return PG_SSL_ERROR, detail
    if "connection refused" in lowered or "could not connect" in lowered:
        return PG_CONN_REFUSED, detail
    return PG_UNKNOWN, detail


# TiDB aliases (mapped from MYSQL_* at connector layer)
TIDB_CONN_REFUSED = "TIDB_CONN_REFUSED"
TIDB_AUTH_FAILED = "TIDB_AUTH_FAILED"
TIDB_TIMEOUT = "TIDB_TIMEOUT"
TIDB_UNKNOWN_DATABASE = "TIDB_UNKNOWN_DATABASE"
TIDB_UNKNOWN = "TIDB_UNKNOWN"


SQLSERVER_CONN_REFUSED = "SQLSERVER_CONN_REFUSED"
SQLSERVER_AUTH_FAILED = "SQLSERVER_AUTH_FAILED"
SQLSERVER_TIMEOUT = "SQLSERVER_TIMEOUT"
SQLSERVER_UNKNOWN_DATABASE = "SQLSERVER_UNKNOWN_DATABASE"
SQLSERVER_SSL_ERROR = "SQLSERVER_SSL_ERROR"
SQLSERVER_UNKNOWN = "SQLSERVER_UNKNOWN"

_SQLSERVER_CODE_MAP: dict[int, str] = {
    20009: SQLSERVER_CONN_REFUSED,
    18456: SQLSERVER_AUTH_FAILED,
    4060: SQLSERVER_UNKNOWN_DATABASE,
}


def map_sqlserver_operational_error(exc: Exception) -> tuple[str, str]:
    detail = str(exc)
    errno = int(exc.args[0]) if getattr(exc, "args", None) and exc.args else 0
    if errno in (20002, 20003):
        return SQLSERVER_TIMEOUT, detail
    if "ssl" in detail.lower() or "encrypt" in detail.lower():
        return SQLSERVER_SSL_ERROR, detail
    code = _SQLSERVER_CODE_MAP.get(errno, SQLSERVER_UNKNOWN)
    if "timeout" in detail.lower():
        return SQLSERVER_TIMEOUT, detail
    return code, detail


ORACLE_CONN_REFUSED = "ORACLE_CONN_REFUSED"
ORACLE_AUTH_FAILED = "ORACLE_AUTH_FAILED"
ORACLE_TIMEOUT = "ORACLE_TIMEOUT"
ORACLE_UNKNOWN_SERVICE = "ORACLE_UNKNOWN_SERVICE"
ORACLE_UNKNOWN = "ORACLE_UNKNOWN"

_SYSTEM_OWNERS = frozenset({"SYS", "SYSTEM"})


def map_oracle_error(exc: Exception) -> tuple[str, str]:
    detail = str(exc)
    lowered = detail.lower()
    if "ora-01017" in lowered:
        return ORACLE_AUTH_FAILED, detail
    if "ora-12514" in lowered or "ora-12505" in lowered or "unknown service" in lowered:
        return ORACLE_UNKNOWN_SERVICE, detail
    if "timeout" in lowered or "timed out" in lowered:
        return ORACLE_TIMEOUT, detail
    if "refused" in lowered or isinstance(exc, ConnectionRefusedError):
        return ORACLE_CONN_REFUSED, detail
    return ORACLE_UNKNOWN, detail


# Hive
HIVE_CONN_REFUSED = "HIVE_CONN_REFUSED"
HIVE_AUTH_FAILED = "HIVE_AUTH_FAILED"
HIVE_TIMEOUT = "HIVE_TIMEOUT"
HIVE_UNKNOWN_DATABASE = "HIVE_UNKNOWN_DATABASE"
HIVE_UNKNOWN = "HIVE_UNKNOWN"


def map_hive_error(exc: Exception) -> tuple[str, str]:
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


# ClickHouse
CLICKHOUSE_CONN_REFUSED = "CLICKHOUSE_CONN_REFUSED"
CLICKHOUSE_AUTH_FAILED = "CLICKHOUSE_AUTH_FAILED"
CLICKHOUSE_TIMEOUT = "CLICKHOUSE_TIMEOUT"
CLICKHOUSE_UNKNOWN_DATABASE = "CLICKHOUSE_UNKNOWN_DATABASE"
CLICKHOUSE_UNKNOWN = "CLICKHOUSE_UNKNOWN"


def map_clickhouse_error(exc: Exception) -> tuple[str, str]:
    detail = str(exc)
    lowered = detail.lower()
    if "401" in detail or "unauthorized" in lowered or "auth" in lowered:
        return CLICKHOUSE_AUTH_FAILED, detail
    if "timeout" in lowered or "timed out" in lowered:
        return CLICKHOUSE_TIMEOUT, detail
    if "refused" in lowered or isinstance(exc, ConnectionRefusedError):
        return CLICKHOUSE_CONN_REFUSED, detail
    if "database" in lowered and ("unknown" in lowered or "doesn't exist" in lowered):
        return CLICKHOUSE_UNKNOWN_DATABASE, detail
    return CLICKHOUSE_UNKNOWN, detail


# Doris (MySQL protocol alias)
DORIS_TIMEOUT = "DORIS_TIMEOUT"
DORIS_CONN_REFUSED = "DORIS_CONN_REFUSED"
DORIS_AUTH_FAILED = "DORIS_AUTH_FAILED"
DORIS_UNKNOWN_DATABASE = "DORIS_UNKNOWN_DATABASE"
DORIS_UNKNOWN = "DORIS_UNKNOWN"


def map_doris_operational_error(exc: pymysql.err.OperationalError) -> tuple[str, str]:
    code, detail = map_mysql_operational_error(exc)
    mapping = {
        "MYSQL_TIMEOUT": DORIS_TIMEOUT,
        "MYSQL_CONN_REFUSED": DORIS_CONN_REFUSED,
        "MYSQL_AUTH_FAILED": DORIS_AUTH_FAILED,
        "MYSQL_UNKNOWN_DATABASE": DORIS_UNKNOWN_DATABASE,
    }
    return mapping.get(code, DORIS_UNKNOWN), detail


# GaussDB (PostgreSQL-compatible alias)
GAUSSDB_CONN_REFUSED = "GAUSSDB_CONN_REFUSED"
GAUSSDB_AUTH_FAILED = "GAUSSDB_AUTH_FAILED"
GAUSSDB_TIMEOUT = "GAUSSDB_TIMEOUT"
GAUSSDB_UNKNOWN_DATABASE = "GAUSSDB_UNKNOWN_DATABASE"
GAUSSDB_UNKNOWN = "GAUSSDB_UNKNOWN"

_GAUSSDB_FROM_PG = {
    PG_CONN_REFUSED: GAUSSDB_CONN_REFUSED,
    PG_AUTH_FAILED: GAUSSDB_AUTH_FAILED,
    PG_TIMEOUT: GAUSSDB_TIMEOUT,
    PG_UNKNOWN_DATABASE: GAUSSDB_UNKNOWN_DATABASE,
    PG_SSL_ERROR: GAUSSDB_UNKNOWN,
    PG_UNKNOWN: GAUSSDB_UNKNOWN,
}


def map_gaussdb_error(exc: Exception) -> tuple[str, str]:
    # PG_TIMEOUT → GAUSSDB_TIMEOUT via _GAUSSDB_FROM_PG; PG_AUTH_FAILED → GAUSSDB_AUTH_FAILED
    if hasattr(exc, "sqlstate") or "OperationalError" in type(exc).__name__:
        pg_code, detail = map_postgres_operational_error(exc)
        return _GAUSSDB_FROM_PG.get(pg_code, GAUSSDB_UNKNOWN), detail
    detail = str(exc)
    lowered = detail.lower()
    if "auth" in lowered or "password" in lowered:
        return GAUSSDB_AUTH_FAILED, detail
    if "timeout" in lowered or "timed out" in lowered:
        return GAUSSDB_TIMEOUT, detail
    if "refused" in lowered:
        return GAUSSDB_CONN_REFUSED, detail
    if "database" in lowered and "not" in lowered:
        return GAUSSDB_UNKNOWN_DATABASE, detail
    return GAUSSDB_UNKNOWN, detail


# DM (Dameng)
DM_CONN_REFUSED = "DM_CONN_REFUSED"
DM_AUTH_FAILED = "DM_AUTH_FAILED"
DM_TIMEOUT = "DM_TIMEOUT"
DM_UNKNOWN_DATABASE = "DM_UNKNOWN_DATABASE"
DM_UNKNOWN = "DM_UNKNOWN"
DM_DRIVER_MISSING = "DM_DRIVER_MISSING"


def map_dm_error(exc: Exception) -> tuple[str, str]:
    # auth: password/login/-2501 → DM_AUTH_FAILED; timeout → DM_TIMEOUT
    detail = str(exc)
    lowered = detail.lower()
    if "dmpython" in lowered or "no module named" in lowered and "dm" in lowered:
        return DM_DRIVER_MISSING, detail
    if "password" in lowered or "login" in lowered or "-2501" in detail:
        return DM_AUTH_FAILED, detail
    if "timeout" in lowered or "timed out" in lowered:
        return DM_TIMEOUT, detail
    if "refused" in lowered or isinstance(exc, ConnectionRefusedError):
        return DM_CONN_REFUSED, detail
    if "database" in lowered and ("unknown" in lowered or "not exist" in lowered):
        return DM_UNKNOWN_DATABASE, detail
    return DM_UNKNOWN, detail


# Trino
TRINO_CONN_REFUSED = "TRINO_CONN_REFUSED"
TRINO_AUTH_FAILED = "TRINO_AUTH_FAILED"
TRINO_TIMEOUT = "TRINO_TIMEOUT"
TRINO_UNKNOWN_CATALOG = "TRINO_UNKNOWN_CATALOG"
TRINO_UNKNOWN = "TRINO_UNKNOWN"
TRINO_DRIVER_MISSING = "TRINO_DRIVER_MISSING"


def map_trino_error(exc: Exception) -> tuple[str, str]:
    # auth: 401/unauthorized → TRINO_AUTH_FAILED; timeout → TRINO_TIMEOUT
    detail = str(exc)
    lowered = detail.lower()
    if "no module named" in lowered and "trino" in lowered:
        return TRINO_DRIVER_MISSING, detail
    if "unauthorized" in lowered or "401" in detail or "access denied" in lowered:
        return TRINO_AUTH_FAILED, detail
    if "timeout" in lowered or "timed out" in lowered:
        return TRINO_TIMEOUT, detail
    if "refused" in lowered or isinstance(exc, ConnectionRefusedError):
        return TRINO_CONN_REFUSED, detail
    if "catalog" in lowered and ("not found" in lowered or "does not exist" in lowered):
        return TRINO_UNKNOWN_CATALOG, detail
    if type(exc).__name__ == "TrinoUserError":
        if "catalog" in lowered:
            return TRINO_UNKNOWN_CATALOG, detail
    return TRINO_UNKNOWN, detail


# r39 companion: GAUSSDB_/DM_/TRINO_ timeout/auth 映射由 map_* 统一出口；
# connector test_connection 与 HTTP test 链均消费本模块常量（勿在 dialect 文件内复制错误码）。

__all__ = [
    "CLICKHOUSE_AUTH_FAILED",
    "CLICKHOUSE_CONN_REFUSED",
    "CLICKHOUSE_TIMEOUT",
    "CLICKHOUSE_UNKNOWN",
    "CLICKHOUSE_UNKNOWN_DATABASE",
    "DM_AUTH_FAILED",
    "DM_CONN_REFUSED",
    "DM_DRIVER_MISSING",
    "DM_TIMEOUT",
    "DM_UNKNOWN",
    "DM_UNKNOWN_DATABASE",
    "DORIS_AUTH_FAILED",
    "DORIS_CONN_REFUSED",
    "DORIS_TIMEOUT",
    "DORIS_UNKNOWN",
    "DORIS_UNKNOWN_DATABASE",
    "GAUSSDB_AUTH_FAILED",
    "GAUSSDB_CONN_REFUSED",
    "GAUSSDB_TIMEOUT",
    "GAUSSDB_UNKNOWN",
    "GAUSSDB_UNKNOWN_DATABASE",
    "HIVE_AUTH_FAILED",
    "HIVE_CONN_REFUSED",
    "HIVE_TIMEOUT",
    "HIVE_UNKNOWN",
    "HIVE_UNKNOWN_DATABASE",
    "MYSQL_AUTH_FAILED",
    "MYSQL_CONN_REFUSED",
    "MYSQL_SSL_ERROR",
    "MYSQL_TIMEOUT",
    "MYSQL_UNKNOWN",
    "MYSQL_UNKNOWN_DATABASE",
    "ORACLE_AUTH_FAILED",
    "ORACLE_CONN_REFUSED",
    "ORACLE_TIMEOUT",
    "ORACLE_UNKNOWN",
    "ORACLE_UNKNOWN_SERVICE",
    "PG_AUTH_FAILED",
    "PG_CONN_REFUSED",
    "PG_SSL_ERROR",
    "PG_TIMEOUT",
    "PG_UNKNOWN",
    "PG_UNKNOWN_DATABASE",
    "SQLSERVER_AUTH_FAILED",
    "SQLSERVER_CONN_REFUSED",
    "SQLSERVER_SSL_ERROR",
    "SQLSERVER_TIMEOUT",
    "SQLSERVER_UNKNOWN",
    "SQLSERVER_UNKNOWN_DATABASE",
    "TIDB_AUTH_FAILED",
    "TIDB_CONN_REFUSED",
    "TIDB_TIMEOUT",
    "TIDB_UNKNOWN",
    "TIDB_UNKNOWN_DATABASE",
    "TRINO_AUTH_FAILED",
    "TRINO_CONN_REFUSED",
    "TRINO_DRIVER_MISSING",
    "TRINO_TIMEOUT",
    "TRINO_UNKNOWN",
    "TRINO_UNKNOWN_CATALOG",
    "map_clickhouse_error",
    "map_dm_error",
    "map_doris_operational_error",
    "map_gaussdb_error",
    "map_hive_error",
    "map_mysql_operational_error",
    "map_oracle_error",
    "map_postgres_operational_error",
    "map_sqlserver_operational_error",
    "map_trino_error",
    "pg_sslmode",
]
