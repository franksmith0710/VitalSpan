"""G5 dashboard visual PDF export (Playwright path, mocked in CI)."""
from __future__ import annotations

import sys
import types
import uuid
from contextlib import contextmanager
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.dashboard.export_jobs import reset_export_jobs_for_tests
from app.dashboard.export_token import issue_export_token, reset_export_tokens_for_tests

FAKE_PDF = b"%PDF-1.4 visual snapshot\n" + b"x" * 600


class _FakePage:
    def goto(self, *_args, **_kwargs) -> None:
        return None

    def wait_for_selector(self, *_args, **_kwargs) -> None:
        return None

    def wait_for_timeout(self, *_args, **_kwargs) -> None:
        return None

    def pdf(self, **_kwargs) -> bytes:
        return FAKE_PDF


class _FakeBrowser:
    def new_page(self, **_kwargs) -> _FakePage:
        return _FakePage()

    def close(self) -> None:
        return None


class _FakeChromium:
    def launch(self, **_kwargs) -> _FakeBrowser:
        return _FakeBrowser()


class _FakePlaywright:
    chromium = _FakeChromium()


@contextmanager
def _fake_sync_playwright():
    yield _FakePlaywright()


def _install_playwright_mock(monkeypatch) -> None:
    sync_api_mod = types.ModuleType("playwright.sync_api")
    sync_api_mod.sync_playwright = _fake_sync_playwright
    sync_api_mod.Error = Exception
    playwright_mod = types.ModuleType("playwright")
    playwright_mod.sync_api = sync_api_mod
    monkeypatch.setitem(sys.modules, "playwright", playwright_mod)
    monkeypatch.setitem(sys.modules, "playwright.sync_api", sync_api_mod)


@pytest.fixture(autouse=True)
def _reset_export_state():
    reset_export_jobs_for_tests()
    reset_export_tokens_for_tests()
    yield
    reset_export_jobs_for_tests()
    reset_export_tokens_for_tests()


@pytest.fixture
def mock_playwright(monkeypatch):
    _install_playwright_mock(monkeypatch)


def test_export_layout_requires_valid_token(client: TestClient, auth_headers: dict) -> None:
    created = client.post(
        "/api/v1/dashboards",
        headers=auth_headers,
        json={"name": f"Export Layout {uuid.uuid4().hex[:6]}"},
    )
    assert created.status_code == 201
    dash_id = created.json()["id"]
    token = issue_export_token(uuid.UUID(dash_id))

    ok = client.get(f"/api/v1/dashboards/{dash_id}/export-layout?token={token}")
    assert ok.status_code == 200
    body = ok.json()
    assert body["id"] == dash_id
    assert "layoutJson" in body

    bad = client.get(f"/api/v1/dashboards/{dash_id}/export-layout?token=invalid")
    assert bad.status_code == 403


def test_submit_pdf_export_returns_visual_snapshot(
    client: TestClient,
    auth_headers: dict,
    mock_playwright,
) -> None:
    created = client.post(
        "/api/v1/dashboards",
        headers=auth_headers,
        json={"name": f"Visual PDF {uuid.uuid4().hex[:6]}"},
    )
    assert created.status_code == 201
    dash_id = created.json()["id"]

    job = client.post(
        f"/api/v1/dashboards/{dash_id}/export-jobs",
        headers=auth_headers,
        json={"format": "pdf"},
    )
    assert job.status_code == 201, job.text
    body = job.json()
    assert body["status"] == "ready"
    assert body["artifactKind"] == "visual_snapshot"

    download = client.get(body["downloadUrl"], headers=auth_headers)
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF")
    assert b"LAYOUT INVENTORY PREVIEW" not in download.content[:4096]


def test_render_rejects_inventory_leak(monkeypatch) -> None:
    from app.dashboard import service as dash_service
    from app.dashboard.export_render import render_dashboard_visual_pdf

    inventory_pdf = b"LAYOUT INVENTORY PREVIEW\n" + b"x" * 600

    class _InventoryPage(_FakePage):
        def pdf(self, **_kwargs) -> bytes:
            return inventory_pdf

    class _InventoryBrowser(_FakeBrowser):
        def new_page(self, **_kwargs) -> _InventoryPage:
            return _InventoryPage()

    class _InventoryChromium(_FakeChromium):
        def launch(self, **_kwargs) -> _InventoryBrowser:
            return _InventoryBrowser()

    @contextmanager
    def _inventory_playwright():
        fake = _FakePlaywright()
        fake.chromium = _InventoryChromium()
        yield fake

    sync_api_mod = types.ModuleType("playwright.sync_api")
    sync_api_mod.sync_playwright = _inventory_playwright
    sync_api_mod.Error = Exception
    monkeypatch.setitem(sys.modules, "playwright", types.ModuleType("playwright"))
    monkeypatch.setitem(sys.modules, "playwright.sync_api", sync_api_mod)

    dash_id = uuid.uuid4()
    token = issue_export_token(dash_id)
    with pytest.raises(dash_service.DashboardError) as exc:
        render_dashboard_visual_pdf(dash_id, token=token)
    assert exc.value.code == "DASH_EXPORT_RENDER_INVENTORY_LEAK"


def test_build_export_snapshot_url_respects_base_path() -> None:
    from types import SimpleNamespace

    from app.dashboard.export_fe_url import build_export_snapshot_url

    dash_id = uuid.uuid4()
    token = "tok"
    settings = SimpleNamespace(fe_base_url="http://localhost:5173", fe_base_path="sc-datav")
    url = build_export_snapshot_url(dash_id, token=token, surface="dashboard", settings=settings)
    assert url == f"http://localhost:5173/sc-datav/export/dashboard/{dash_id}?token={token}"
