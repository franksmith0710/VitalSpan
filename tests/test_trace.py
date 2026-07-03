import io
import json
import logging
import re

TRACE_ID_HEX_PATTERN = re.compile(r"^[0-9a-f]{32}$")


def test_health_response_includes_generated_trace_id(client):
    """T-TRC-01: GET /health 响应含 X-Trace-Id（32 位 hex）。"""
    response = client.get("/health")
    assert response.status_code == 200
    trace_id = response.headers.get("X-Trace-Id")
    assert trace_id is not None
    assert TRACE_ID_HEX_PATTERN.match(trace_id)


def test_health_preserves_incoming_trace_id(client):
    """T-TRC-02: 透传已有 X-Trace-Id 请求头。"""
    incoming = "abc123"
    response = client.get("/health", headers={"X-Trace-Id": incoming})
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
