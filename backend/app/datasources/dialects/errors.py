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
