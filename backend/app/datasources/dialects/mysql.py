from __future__ import annotations

import re
import time
from typing import Literal

import pymysql
import pymysql.err

from app.core.config import get_settings
from app.datasources.dialects.base import TestConnectionResult
from app.datasources.dialects.errors import map_mysql_operational_error

_SSL_MODES = frozenset({"disabled", "preferred", "required"})
_COLLATION_RE = re.compile(r"^[\w-]+$")


def _collation_init_command(charset: str, collation: str | None) -> str | None:
    if collation is None:
        return None
    if not _COLLATION_RE.match(charset) or not _COLLATION_RE.match(collation):
        raise ValueError(f"invalid charset/collation: {charset}/{collation}")
    return f"SET NAMES {charset} COLLATE {collation}"


class MysqlConnector:
    type = "mysql"
    category = "relational"
    capabilities = ("connectivity_test",)

    def test_connection(
        self,
        *,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        timeout_sec: float = 5.0,
        charset: str = "utf8mb4",
        collation: str | None = None,
        ssl_mode: Literal["disabled", "preferred", "required"] = "preferred",
        connect_timeout_sec: float | None = None,
        read_timeout_sec: float | None = None,
    ) -> TestConnectionResult:
        if ssl_mode not in _SSL_MODES:
            raise ValueError(f"invalid ssl_mode: {ssl_mode}")
        settings = get_settings()
        connect_raw = connect_timeout_sec if connect_timeout_sec is not None else timeout_sec
        clamped_connect = max(1.0, min(float(connect_raw), float(min(30, settings.query_timeout_seconds))))
        connect_timeout = int(clamped_connect)
        read_raw = read_timeout_sec if read_timeout_sec is not None else clamped_connect
        clamped_read = max(1.0, min(float(read_raw), float(min(30, settings.query_timeout_seconds))))
        read_timeout = int(clamped_read)
        connect_kwargs: dict = {
            "host": host,
            "port": port,
            "user": username,
            "password": password,
            "database": database,
            "charset": charset,
            "connect_timeout": connect_timeout,
            "read_timeout": read_timeout,
            "write_timeout": connect_timeout,
        }
        init_cmd = _collation_init_command(charset, collation)
        if init_cmd:
            connect_kwargs["init_command"] = init_cmd
        if ssl_mode == "required":
            connect_kwargs["ssl"] = {"ssl": {}}
        elif ssl_mode == "disabled":
            connect_kwargs["ssl"] = None
        started = time.perf_counter()
        try:
            connection = pymysql.connect(**connect_kwargs)
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
