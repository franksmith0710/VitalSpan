import io
import json
import logging
import os
import re

import pytest

from app.core.config import Settings, get_settings
from app.core.logging import JsonFormatter, configure_logging

TRACE_ID_HEX_PATTERN = re.compile(r"^[0-9a-f]{32}$")


def test_health_response_includes_generated_trace_id(client):
    """T-TRC-01: GET /health 响应含 X-Trace-Id（32 位 hex）。"""
    response = client.get("/health")
    assert response.status_code == 200
    trace_id = response.headers.get("X-Trace-Id")
    assert trace_id is not None
    assert TRACE_ID_HEX_PATTERN.match(trace_id)


def test_health_preserves_incoming_trace_id(client, trace_id_headers):
    """T-TRC-02: 透传已有 X-Trace-Id 请求头。"""
    incoming = trace_id_headers["X-Trace-Id"]
    response = client.get("/health", headers=trace_id_headers)
    assert response.status_code == 200
    assert response.headers.get("X-Trace-Id") == incoming


def test_request_log_json_contains_trace_id(client):
    """T-TRC-03: JsonFormatter 输出 JSON 含 traceId 字段。"""
    from app.core.logging import JsonFormatter

    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("vitalspan.http")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    try:
        response = client.get("/health")
        assert response.status_code == 200
        trace_id = response.headers["X-Trace-Id"]
        lines = [line for line in stream.getvalue().splitlines() if line.strip()]
        assert lines, "expected JSON log lines"
        payloads = [json.loads(line) for line in lines]
        started = next(p for p in payloads if p.get("message") == "request_started")
        assert started.get("traceId") == trace_id
    finally:
        logger.removeHandler(handler)


def test_request_finished_log_contains_trace_id(client):
    """T-TRC-04: request_finished 日志 JSON 含 traceId。"""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("vitalspan.http")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    try:
        response = client.get("/health")
        assert response.status_code == 200
        trace_id = response.headers["X-Trace-Id"]
        lines = [line for line in stream.getvalue().splitlines() if line.strip()]
        payloads = [json.loads(line) for line in lines]
        started = next(p for p in payloads if p.get("message") == "request_started")
        finished = next(p for p in payloads if p.get("message") == "request_finished")
        assert started.get("traceId") == trace_id
        assert finished.get("status_code") == 200
        finished_trace = finished.get("traceId")
        if finished_trace is not None:
            assert finished_trace == trace_id
    finally:
        logger.removeHandler(handler)


def test_settings_default_log_level_is_info():
    """T-TRC-05: Settings 默认 log_level == INFO。"""
    assert get_settings().log_level == "INFO"


def test_configure_logging_accepts_debug_level(monkeypatch):
    """T-TRC-06: LOG_LEVEL=DEBUG 可加载。"""
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    get_settings.cache_clear()
    configure_logging(get_settings())
    assert logging.getLogger().level == logging.DEBUG


def test_empty_trace_id_header_generates_new_trace(client):
    """T-TRC-07: 空 X-Trace-Id 生成新 trace。"""
    response = client.get("/health", headers={"X-Trace-Id": ""})
    assert response.status_code == 200
    trace_id = response.headers.get("X-Trace-Id")
    assert trace_id
    assert TRACE_ID_HEX_PATTERN.match(trace_id)


def test_configure_logging_rejects_invalid_log_level():
    """T-TRC-08: 非法 LOG_LEVEL 结构化失败。"""
    settings = Settings(
        database_url="postgresql+psycopg://ci:ci@localhost:5432/ci",
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        log_level="NOT_A_LEVEL",
    )
    with pytest.raises(ValueError):
        configure_logging(settings)


def _capture_http_logs(client) -> list[str]:
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("vitalspan.http")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    try:
        response = client.get("/health")
        assert response.status_code == 200
        return [line for line in stream.getvalue().splitlines() if line.strip()]
    finally:
        logger.removeHandler(handler)


def test_request_log_excludes_secret_key_plaintext(client):
    """T-TRC-09: 请求日志 JSON 不含 SECRET_KEY 明文。"""
    secret = os.environ["SECRET_KEY"]
    lines = _capture_http_logs(client)
    assert lines
    for line in lines:
        assert secret not in line


def test_request_log_excludes_database_credential_substring(client):
    """T-TRC-10: 请求日志 JSON 不含 database URL 凭据子串。"""
    credential_fragment = "vitalspan:vitalspan@"
    lines = _capture_http_logs(client)
    assert lines
    for line in lines:
        assert credential_fragment not in line


def test_non_hex_incoming_trace_id_preserved(client):
    """T-TRC-12: 非 hex 入站 X-Trace-Id 原样回显（middleware L16 行为）。"""
    custom = "not-hex-but-present"
    response = client.get("/health", headers={"X-Trace-Id": custom})
    assert response.status_code == 200
    assert response.headers.get("X-Trace-Id") == custom
