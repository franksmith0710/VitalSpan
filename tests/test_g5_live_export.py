"""Live G5 PDF export (requires FE dev + uvicorn + Playwright; skip when env unavailable)."""

from __future__ import annotations

import json
import os
import sys
import uuid
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from app.core.config import get_settings
from app.dashboard.export_jobs import reset_export_jobs_for_tests
from app.dashboard.export_token import reset_export_tokens_for_tests

pytestmark = pytest.mark.integration

_TESTS_DIR = Path(__file__).resolve().parent
if str(_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_DIR))

BACKEND_BASE = os.environ.get("VITALSPAN_LIVE_API", "http://127.0.0.1:8000")


def _url_reachable(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            return resp.status == 200
    except (OSError, urllib.error.URLError):
        return False


def _fe_probe_url() -> str:
    settings = get_settings()
    base = settings.fe_base_url.rstrip("/")
    path = settings.fe_base_path.strip("/")
    if path:
        base = f"{base}/{path}"
    return f"{base}/"


def _live_auth_headers() -> dict[str, str]:
    from jwt_auth import jwt_auth_headers

    headers = jwt_auth_headers()
    headers["Content-Type"] = "application/json"
    return headers


def _live_request(method: str, path: str, body: dict | None = None) -> tuple[int, bytes]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BACKEND_BASE.rstrip('/')}{path}",
        data=data,
        headers=_live_auth_headers(),
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


@pytest.fixture(autouse=True)
def _reset_export_state():
    reset_export_jobs_for_tests()
    reset_export_tokens_for_tests()
    yield
    reset_export_jobs_for_tests()
    reset_export_tokens_for_tests()


def test_fe_base_url_reachable():
    if not _url_reachable(_fe_probe_url()):
        pytest.skip("FE dev not running at FE_BASE_URL")


def test_backend_health_reachable():
    if not _url_reachable(f"{BACKEND_BASE.rstrip('/')}/health"):
        pytest.skip("uvicorn not running at VITALSPAN_LIVE_API")


def test_live_pdf_export_without_playwright_mock():
    if not _url_reachable(_fe_probe_url()):
        pytest.skip("FE dev not running at FE_BASE_URL")
    if not _url_reachable(f"{BACKEND_BASE.rstrip('/')}/health"):
        pytest.skip("uvicorn not running at VITALSPAN_LIVE_API")

    status, raw = _live_request("POST", "/api/v1/dashboards", {"name": f"Live G5 {uuid.uuid4().hex[:6]}"})
    assert status == 201, raw.decode("utf-8", "replace")
    dash_id = json.loads(raw)["id"]

    status, raw = _live_request("POST", f"/api/v1/dashboards/{dash_id}/export-jobs", {"format": "pdf"})
    assert status == 201, raw.decode("utf-8", "replace")
    body = json.loads(raw)
    assert body["artifactKind"] == "visual_snapshot"

    status, pdf = _live_request("GET", body["downloadUrl"])
    assert status == 200
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 5120
    assert b"LAYOUT INVENTORY PREVIEW" not in pdf[:4096]
