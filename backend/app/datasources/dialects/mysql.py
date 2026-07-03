from __future__ import annotations

import time

import pymysql
import pymysql.err

from app.datasources.dialects.base import TestConnectionResult


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
    ) -> TestConnectionResult:
        started = time.perf_counter()
        timeout = max(1, int(timeout_sec))
        try:
            connection = pymysql.connect(
                host=host,
                port=port,
                user=username,
                password=password,
                database=database,
                connect_timeout=timeout,
                read_timeout=timeout,
                write_timeout=timeout,
            )
            try:
                connection.ping(reconnect=False)
            finally:
                connection.close()
        except pymysql.err.OperationalError as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=str(exc.args[1] if len(exc.args) > 1 else exc), latency_ms=latency_ms)
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=str(exc), latency_ms=latency_ms)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms)
