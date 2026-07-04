from __future__ import annotations

import time
from typing import Any

from opensearchpy import OpenSearch

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult

OPENSEARCH_INVALID_HOST = "OPENSEARCH_INVALID_HOST"
OPENSEARCH_CONNECTION_REFUSED = "OPENSEARCH_CONNECTION_REFUSED"
OPENSEARCH_AUTH_FAILED = "OPENSEARCH_AUTH_FAILED"
OPENSEARCH_TIMEOUT = "OPENSEARCH_TIMEOUT"
OPENSEARCH_UNKNOWN = "OPENSEARCH_UNKNOWN"
OPENSEARCH_MAX_MAPPING_FIELDS = 500

_OS_TYPE_MAP = {
    "keyword": "string",
    "text": "string",
    "long": "number",
    "integer": "number",
    "double": "number",
    "float": "number",
    "date": "datetime",
    "boolean": "boolean",
    "object": "json",
    "nested": "json",
}


def _normalize_os_type(os_type: str) -> str:
    return _OS_TYPE_MAP.get(os_type, "unknown")


def _build_client(*, host: str, port: int, username: str, password: str, timeout_sec: float) -> OpenSearch:
    if not host.strip():
        raise ValueError("host is required")
    scheme = "https" if port == 443 else "http"
    url = f"{scheme}://{host}:{port}"
    kwargs: dict[str, Any] = {"hosts": [url], "timeout": timeout_sec}
    if username or password:
        kwargs["http_auth"] = (username, password)
    return OpenSearch(**kwargs)


class OpensearchConnector:
    type = "opensearch"
    category = "search"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "OpenSearch"

    def test_connection(
        self,
        *,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        timeout_sec: float = 5.0,
        **_: object,
    ) -> TestConnectionResult:
        started = time.perf_counter()
        try:
            client = _build_client(
                host=host, port=port, username=username, password=password, timeout_sec=timeout_sec
            )
            client.info()
        except ValueError:
            return TestConnectionResult(
                ok=False,
                message="[OPENSEARCH_INVALID_HOST] host is required",
                latency_ms=int((time.perf_counter() - started) * 1000),
                code=OPENSEARCH_INVALID_HOST,
            )
        except Exception as exc:
            msg = str(exc).lower()
            code = OPENSEARCH_UNKNOWN
            if "timeout" in msg or "timed out" in msg:
                code = OPENSEARCH_TIMEOUT
            elif "connection refused" in msg or "failed to establish" in msg:
                code = OPENSEARCH_CONNECTION_REFUSED
            elif "authentication" in msg or "401" in msg or "403" in msg:
                code = OPENSEARCH_AUTH_FAILED
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=f"[{code}] {exc}", latency_ms=latency_ms, code=code)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def open_connection(
        self,
        *,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        connect_timeout_sec: float = 5.0,
        **_: object,
    ) -> OpenSearch:
        return _build_client(
            host=host,
            port=port,
            username=username,
            password=password,
            timeout_sec=connect_timeout_sec,
        )

    def list_schemas(self, connection: OpenSearch) -> list[SchemaInfo]:
        rows = connection.cat.indices(format="json")
        names = [row["index"] for row in rows if not str(row["index"]).startswith(".")]
        return [SchemaInfo(name=n) for n in sorted(names)]

    def list_tables(self, connection: OpenSearch, schema: str) -> list[TableInfo]:
        return [TableInfo(name="_doc", type="index")]

    def list_columns(self, connection: OpenSearch, schema: str, table: str) -> list[ColumnInfo]:
        mapping = connection.indices.get_mapping(index=schema)
        props = mapping.get(schema, {}).get("mappings", {}).get("properties", {})
        columns = [
            ColumnInfo(
                name=name,
                data_type=_normalize_os_type(str(meta.get("type", "object"))),
                nullable=True,
            )
            for name, meta in sorted(props.items())
        ]
        if len(columns) > OPENSEARCH_MAX_MAPPING_FIELDS:
            return columns[:OPENSEARCH_MAX_MAPPING_FIELDS]
        return columns
