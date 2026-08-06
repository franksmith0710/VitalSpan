"""Headless FE capture → PDF bytes for dashboard/data-screen export."""

from __future__ import annotations

import logging
import time
import urllib.error
import urllib.request
from uuid import UUID

from app.core.config import get_settings
from app.dashboard import service as dash_service
from app.dashboard.export_fe_url import build_export_snapshot_url

logger = logging.getLogger(__name__)

PLAYWRIGHT_INSTALL_HINT = "pip install playwright && playwright install chromium"

CAPTURE_SELECTOR = '[data-export-ready="true"]'
SETTLE_MS = 1500
NAV_TIMEOUT_MS = 30_000
HEALTH_PROBE_CACHE_SECONDS = 60
HEALTH_BROWSER_TIMEOUT_MS = 8_000
HEALTH_FE_TIMEOUT_SECONDS = 3

_health_cache: dict | None = None
_health_cache_at: float = 0.0


def _fe_probe_url() -> str:
    settings = get_settings()
    base = settings.fe_base_url.rstrip("/")
    path = settings.fe_base_path.strip("/")
    if path:
        base = f"{base}/{path}"
    return f"{base}/"


def _fe_reachable() -> tuple[bool, str | None]:
    url = _fe_probe_url()
    try:
        with urllib.request.urlopen(url, timeout=HEALTH_FE_TIMEOUT_SECONDS) as resp:
            if resp.status != 200:
                return False, f"前端导出服务不可达（{url} 返回 {resp.status}）"
    except (OSError, urllib.error.URLError) as exc:
        return False, f"前端导出服务不可达（{url}）：{exc}"
    return True, None


def probe_export_render_health(*, force_refresh: bool = False) -> dict:
    """Playwright + Chromium + FE reachability probe for schedule pre-check UI."""
    global _health_cache, _health_cache_at

    now = time.monotonic()
    if (
        not force_refresh
        and _health_cache is not None
        and now - _health_cache_at < HEALTH_PROBE_CACHE_SECONDS
    ):
        return _health_cache

    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError:
        result = {
            "status": "unavailable",
            "error": f"Playwright 未安装；请 {PLAYWRIGHT_INSTALL_HINT}",
        }
        _health_cache = result
        _health_cache_at = now
        return result

    fe_ok, fe_error = _fe_reachable()
    if not fe_ok:
        result = {"status": "unavailable", "error": fe_error}
        _health_cache = result
        _health_cache_at = now
        return result

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                timeout=HEALTH_BROWSER_TIMEOUT_MS,
            )
            browser.close()
    except PlaywrightError as exc:
        message = str(exc)
        if "Executable doesn't exist" in message or "browserType.launch" in message:
            error = f"Chromium 未安装；请 {PLAYWRIGHT_INSTALL_HINT}"
        else:
            error = f"Playwright/Chromium 不可用：{message}"
        result = {"status": "unavailable", "error": error}
        _health_cache = result
        _health_cache_at = now
        return result

    result = {"status": "available", "error": None}
    _health_cache = result
    _health_cache_at = now
    return result


def reset_export_render_health_cache_for_tests() -> None:
    global _health_cache, _health_cache_at
    _health_cache = None
    _health_cache_at = 0.0


def render_dashboard_visual_pdf(
    dashboard_id: UUID,
    *,
    token: str,
    surface: str = "dashboard",
) -> bytes:
    settings = get_settings()
    url = build_export_snapshot_url(dashboard_id, token=token, surface=surface, settings=settings)

    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise dash_service.DashboardError(
            "DASH_EXPORT_RENDER_UNAVAILABLE",
            "Playwright 未安装；请 pip install playwright && playwright install chromium",
            503,
        ) from exc

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
                page.wait_for_selector(CAPTURE_SELECTOR, timeout=NAV_TIMEOUT_MS)
                page.wait_for_timeout(SETTLE_MS)
                pdf_bytes = page.pdf(format="A4", print_background=True, landscape=True)
            finally:
                browser.close()
    except PlaywrightError as exc:
        logger.warning("dashboard_visual_export_failed id=%s url=%s err=%s", dashboard_id, url, exc)
        raise dash_service.DashboardError(
            "DASH_EXPORT_RENDER_FAILED",
            f"可视化导出渲染失败（{url}）：{exc}",
            502,
        ) from exc

    if not pdf_bytes or len(pdf_bytes) < 512:
        raise dash_service.DashboardError(
            "DASH_EXPORT_RENDER_EMPTY",
            "可视化导出产物为空",
            502,
        )
    if b"LAYOUT INVENTORY PREVIEW" in pdf_bytes[:4096]:
        raise dash_service.DashboardError(
            "DASH_EXPORT_RENDER_INVENTORY_LEAK",
            "导出产物仍为布局清单，请检查 export 路由",
            502,
        )
    return pdf_bytes
