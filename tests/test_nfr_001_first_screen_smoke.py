"""M5 NFR-001 companion — Dashboard first-screen perf smoke."""
from __future__ import annotations

from app.core.nfr.dashboard_first_screen import (
    DashboardFirstScreenProbeIn,
    probe_dashboard_first_screen,
)


def test_nfr_001_01_extended_widget_fixture_within_budget():
    out = probe_dashboard_first_screen(
        DashboardFirstScreenProbeIn(dashboardId="dash-m5-smoke", widgetCount=4, budgetMs=5000),
    )
    assert out.within_budget is True
    assert out.elapsed_ms <= out.budget_ms
    assert out.widget_count == 4


def test_nfr_001_02_simulate_slow_breach():
    out = probe_dashboard_first_screen(
        DashboardFirstScreenProbeIn(
            dashboardId="dash-m5-smoke", widgetCount=4, budgetMs=5000, simulateSlow=True,
        ),
    )
    assert out.within_budget is False
