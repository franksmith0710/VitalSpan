from __future__ import annotations

import os
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.nfr.errors import (
    DASHBOARD_FIRST_SCREEN_BUDGET_OUT_OF_RANGE,
    DASHBOARD_FIRST_SCREEN_DASHBOARD_REQUIRED,
    DASHBOARD_FIRST_SCREEN_WIDGET_OUT_OF_RANGE,
)

_MOCK_ELAPSED_MS = 800
_SLOW_ELAPSED_MS = 6000


class DashboardFirstScreenError(Exception):
    def __init__(self, code: str, message: str, status: int = 422, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)


class DashboardFirstScreenProbeIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dashboard_id: str = Field(default="", alias="dashboardId", max_length=128)
    budget_ms: int = Field(default=5000, alias="budgetMs")
    widget_count: int = Field(default=12, alias="widgetCount")
    simulate_slow: bool = Field(default=False, alias="simulateSlow")


class DashboardFirstScreenValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    valid: bool
    dashboard_id: str = Field(alias="dashboardId")
    budget_ms: int = Field(alias="budgetMs")


class DashboardFirstScreenProbeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dashboard_id: str = Field(alias="dashboardId")
    elapsed_ms: int = Field(alias="elapsedMs")
    within_budget: bool = Field(alias="withinBudget")
    budget_ms: int = Field(alias="budgetMs")
    widget_count: int = Field(alias="widgetCount")
    sampled_at: datetime = Field(alias="sampledAt")


def _guard(payload: DashboardFirstScreenProbeIn) -> DashboardFirstScreenProbeIn:
    if not payload.dashboard_id or not payload.dashboard_id.strip():
        raise DashboardFirstScreenError(
            DASHBOARD_FIRST_SCREEN_DASHBOARD_REQUIRED,
            "dashboardId is required",
            422,
            [{"field": "dashboardId", "message": "required"}],
        )
    if payload.budget_ms < 1000 or payload.budget_ms > 30000:
        raise DashboardFirstScreenError(
            DASHBOARD_FIRST_SCREEN_BUDGET_OUT_OF_RANGE,
            "budgetMs out of range",
            422,
        )
    if payload.widget_count < 1 or payload.widget_count > 64:
        raise DashboardFirstScreenError(
            DASHBOARD_FIRST_SCREEN_WIDGET_OUT_OF_RANGE,
            "widgetCount out of range",
            422,
        )
    return payload


def validate_dashboard_first_screen(payload: DashboardFirstScreenProbeIn) -> DashboardFirstScreenValidateOut:
    item = _guard(payload)
    return DashboardFirstScreenValidateOut(
        valid=True,
        dashboard_id=item.dashboard_id,
        budget_ms=item.budget_ms,
    )


def probe_dashboard_first_screen(payload: DashboardFirstScreenProbeIn) -> DashboardFirstScreenProbeOut:
    item = _guard(payload)
    strict = os.environ.get("DASHBOARD_FIRST_SCREEN_MODE") == "strict"
    slow = item.simulate_slow or strict
    elapsed = _SLOW_ELAPSED_MS if slow else _MOCK_ELAPSED_MS
    within = elapsed <= item.budget_ms
    return DashboardFirstScreenProbeOut(
        dashboard_id=item.dashboard_id,
        elapsed_ms=elapsed,
        within_budget=within,
        budget_ms=item.budget_ms,
        widget_count=item.widget_count,
        sampled_at=datetime.now(UTC),
    )
