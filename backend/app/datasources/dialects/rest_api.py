from __future__ import annotations

import json
import time
from typing import Any
from urllib.parse import urlparse

import httpx

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult
from app.datasources.dialects.errors import (
    REST_API_AUTH_FAILED,
    REST_API_INVALID_URL,
    REST_API_PROBE_FAILED,
    map_rest_api_error,
)
from app.query.native.guard import guard_native_injection
from app.query.schemas import QueryError

REST_API_MAX_COLUMNS = 500


def _normalize_base_url(host: str, port: int) -> str:
    host = host.strip().rstrip("/")
    if host.startswith("http://") or host.startswith("https://"):
        return host
    scheme = "https" if port == 443 else "http"
    return f"{scheme}://{host}" if "://" not in host else host


def probe_readonly_fetch(client: httpx.Client, *, path: str) -> bool:
    try:
        resp = client.get(path, timeout=5.0)
        return resp.is_success
    except Exception:
        return False


class RestApiConnector:
    type = "rest_api"
    category = "api"
    capabilities = ("connectivity_test", "schema_browser", "native_query")
    display_name = "REST API"

    def _client(self, **kwargs: Any) -> httpx.Client:
        base = _normalize_base_url(kwargs["host"], int(kwargs.get("port", 443)))
        username = kwargs.get("username") or ""
        password = kwargs.get("password") or ""
        auth = None
        if username and username not in ("none", "oauth2"):
            auth = (username, password)
        timeout = float(kwargs.get("timeout_sec", 5.0))
        return httpx.Client(base_url=base, auth=auth, timeout=timeout, follow_redirects=True)

    def test_connection(self, **kwargs: Any) -> TestConnectionResult:
        started = time.perf_counter()
        try:
            base = _normalize_base_url(kwargs["host"], int(kwargs.get("port", 443)))
            if not urlparse(base).scheme:
                raise ValueError("invalid url: missing scheme")
            probe = kwargs.get("database") or "/"
            with self._client(**kwargs) as client:
                resp = client.get(probe if probe.startswith("/") else f"/{probe}")
            if resp.status_code == 401:
                code, detail = REST_API_AUTH_FAILED, "Unauthorized"
                ok = False
            elif not resp.is_success:
                code, detail = REST_API_PROBE_FAILED, f"HTTP {resp.status_code}"
                ok = False
            else:
                ok, code, detail = True, None, "Connection successful"
        except Exception as exc:
            code, detail = map_rest_api_error(exc)
            if "missing scheme" in str(exc).lower():
                code = REST_API_INVALID_URL
            ok = False
        latency_ms = int((time.perf_counter() - started) * 1000)
        if ok:
            return TestConnectionResult(ok=True, message=detail, latency_ms=latency_ms, code=None)
        return TestConnectionResult(ok=False, message=f"[{code}] {detail}", latency_ms=latency_ms, code=code)

    def open_connection(self, **kwargs: Any) -> httpx.Client:
        return self._client(**kwargs)

    def list_schemas(self, connection: httpx.Client) -> list[SchemaInfo]:
        return [SchemaInfo(name="api")]

    def list_tables(self, connection: httpx.Client, schema: str) -> list[TableInfo]:
        return [TableInfo(name="endpoints", type="ENDPOINT")]

    def list_columns(self, connection: httpx.Client, schema: str, table: str) -> list[ColumnInfo]:
        return [
            ColumnInfo(name="path", data_type="string", nullable=False),
            ColumnInfo(name="method", data_type="string", nullable=True),
        ]

    def execute_native_query(
        self,
        connection: httpx.Client,
        *,
        body: dict,
        limit: int,
        offset: int = 0,
        database: str | None = None,
    ) -> tuple[list[str], list[list], bool]:
        guard_native_injection(body)
        path = body.get("path")
        if not isinstance(path, str) or not path.strip():
            raise QueryError("QUERY_NATIVE_INVALID_BODY", "body.path is required", 422)
        method = str(body.get("method", "GET")).upper()
        resp = connection.request(method, path if path.startswith("/") else f"/{path}")
        if resp.status_code == 401:
            raise QueryError(REST_API_AUTH_FAILED, "Unauthorized", 401)
        if not resp.is_success:
            raise QueryError(REST_API_PROBE_FAILED, f"HTTP {resp.status_code}", 400)
        payload = resp.json()
        json_path = body.get("jsonPath")
        if json_path and isinstance(payload, dict):
            payload = payload.get(json_path, [])
        if isinstance(payload, dict):
            columns = sorted(payload.keys())[:REST_API_MAX_COLUMNS]
            rows = [[payload.get(c) for c in columns]]
            return columns, rows, False
        if isinstance(payload, list):
            if not payload:
                return [], [], False
            if isinstance(payload[0], dict):
                columns = sorted({k for item in payload[:limit] for k in item})[:REST_API_MAX_COLUMNS]
                rows = [[item.get(c) for c in columns] for item in payload[offset : offset + limit + 1]]
                truncated = len(rows) > limit
                return columns, rows[:limit], truncated
        return ["value"], [[json.dumps(payload)]], False
