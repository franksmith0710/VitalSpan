from __future__ import annotations

import time
from typing import Literal

import pymysql
import pymysql.err

from app.core.config import get_settings
from app.datasources.dialects.base import TestConnectionResult
from app.datasources.dialects.errors import map_mysql_operational_error

_SSL_MODES = frozenset({"disabled", "preferred", "required"})


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
        ssl_mode: Literal["disabled", "preferred", "required"] = "preferred",
    ) -> TestConnectionResult:
        if ssl_mode not in _SSL_MODES:
            raise ValueError(f"invalid ssl_mode: {ssl_mode}")
        settings = get_settings()
        clamped = max(1.0, min(float(timeout_sec), float(min(30, settings.query_timeout_seconds))))
        timeout = int(clamped)
        connect_kwargs: dict = {
            "host": host,
            "port": port,
            "user": username,
            "password": password,
            "database": database,
            "charset": charset,
            "connect_timeout": timeout,
            "read_timeout": timeout,
            "write_timeout": timeout,
        }
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
            return TestConnectionResult(ok=False, message=f"[{code}] {detail}", latency_ms=latency_ms)
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=str(exc), latency_ms=latency_ms)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms)
