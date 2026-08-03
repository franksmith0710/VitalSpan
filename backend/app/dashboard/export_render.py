"""Headless FE capture → PDF bytes for dashboard/data-screen export."""

from __future__ import annotations

import logging
from uuid import UUID

from app.core.config import get_settings
from app.dashboard import service as dash_service

logger = logging.getLogger(__name__)

CAPTURE_SELECTOR = (
    '[data-dashboard-thumbnail-capture], [data-testid="pixel-canvas-stage"], [data-export-ready="true"]'
)
SETTLE_MS = 1500
NAV_TIMEOUT_MS = 30_000


def render_dashboard_visual_pdf(
    dashboard_id: UUID,
    *,
    token: str,
    surface: str = "dashboard",
) -> bytes:
    settings = get_settings()
    fe_base = settings.fe_base_url.rstrip("/")
    path = "data-screen" if surface == "data_screen" else "dashboard"
    url = f"{fe_base}/export/{path}/{dashboard_id}?token={token}"

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
                page.goto(url, wait_until="networkidle", timeout=NAV_TIMEOUT_MS)
                page.wait_for_selector(CAPTURE_SELECTOR, timeout=NAV_TIMEOUT_MS)
                page.wait_for_timeout(SETTLE_MS)
                pdf_bytes = page.pdf(format="A4", print_background=True, landscape=True)
            finally:
                browser.close()
    except PlaywrightError as exc:
        logger.warning("dashboard_visual_export_failed id=%s err=%s", dashboard_id, exc)
        raise dash_service.DashboardError(
            "DASH_EXPORT_RENDER_FAILED",
            f"可视化导出渲染失败：{exc}",
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
