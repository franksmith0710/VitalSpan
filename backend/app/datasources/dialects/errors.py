from __future__ import annotations

import pymysql.err

MYSQL_CONN_REFUSED = "MYSQL_CONN_REFUSED"
MYSQL_AUTH_FAILED = "MYSQL_AUTH_FAILED"
MYSQL_TIMEOUT = "MYSQL_TIMEOUT"
MYSQL_SSL_ERROR = "MYSQL_SSL_ERROR"
MYSQL_UNKNOWN = "MYSQL_UNKNOWN"

_CODE_MAP: dict[int, str] = {
    2003: MYSQL_CONN_REFUSED,
    1045: MYSQL_AUTH_FAILED,
    2013: MYSQL_TIMEOUT,
}


def map_mysql_operational_error(exc: pymysql.err.OperationalError) -> tuple[str, str]:
    errno = int(exc.args[0]) if exc.args else 0
    detail = str(exc.args[1]) if len(exc.args) > 1 else str(exc)
    code = _CODE_MAP.get(errno, MYSQL_UNKNOWN)
    if "ssl" in detail.lower():
        code = MYSQL_SSL_ERROR
    return code, detail
