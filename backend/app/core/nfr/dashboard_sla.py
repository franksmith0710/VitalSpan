from __future__ import annotations

import os
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.nfr.errors import (
    DASHBOARD_SLA_BELOW_TARGET,
    DASHBOARD_SLA_DASHBOARD_REQUIRED,
    DASHBOARD_SLA_WINDOW_OUT_OF_RANGE,
)

_MOCK_UPTIME = 99.7
_ALERTS = {"enabled": True, "channels": ["email", "webhook"], "thresholdPercent": 99.5}


class DashboardSlaError(Exception):
    def __init__(self, code: str, message: str, status: int = 422, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)


class DashboardSlaProbeIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dashboard_id: str = Field(default="", alias="dashboardId", max_length=128)
    window_hours: int = Field(default=24, alias="windowHours")
    sla_target_percent: float = Field(default=99.5, alias="slaTargetPercent")
    simulate_breach: bool = Field(default=False, alias="simulateBreach")


class DashboardSlaValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    valid: bool
    dashboard_id: str = Field(alias="dashboardId")


class DashboardSlaProbeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dashboard_id: str = Field(alias="dashboardId")
    uptime_percent: float = Field(alias="uptimePercent")
    sla_target_percent: float = Field(alias="slaTargetPercent")
    within_sla: bool = Field(alias="withinSla")
    window_hours: int = Field(alias="windowHours")
    sampled_at: datetime = Field(alias="sampledAt")


class DashboardSlaAlertsOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    enabled: bool
    channels: list[str]
    threshold_percent: float = Field(alias="thresholdPercent")
    configured: bool


def _guard(payload: DashboardSlaProbeIn) -> DashboardSlaProbeIn:
    if not payload.dashboard_id or not payload.dashboard_id.strip():
        raise DashboardSlaError(
            DASHBOARD_SLA_DASHBOARD_REQUIRED,
            "dashboardId is required",
            422,
            [{"field": "dashboardId", "message": "required"}],
        )
    if payload.window_hours < 1 or payload.window_hours > 168:
        raise DashboardSlaError(DASHBOARD_SLA_WINDOW_OUT_OF_RANGE, "windowHours out of range", 422)
    if payload.sla_target_percent < 90.0 or payload.sla_target_percent > 99.99:
        raise DashboardSlaError("DASHBOARD_SLA_TARGET_OUT_OF_RANGE", "slaTargetPercent out of range", 422)
    return payload


def validate_dashboard_sla(payload: DashboardSlaProbeIn) -> DashboardSlaValidateOut:
    item = _guard(payload)
    return DashboardSlaValidateOut(valid=True, dashboard_id=item.dashboard_id)


def probe_dashboard_sla(payload: DashboardSlaProbeIn) -> DashboardSlaProbeOut:
    item = _guard(payload)
    uptime = 99.0 if item.simulate_breach else _MOCK_UPTIME
    within = uptime >= item.sla_target_percent
    strict = os.environ.get("DASHBOARD_SLA_MODE") == "strict"
    if (item.simulate_breach or strict) and not within:
        raise DashboardSlaError(DASHBOARD_SLA_BELOW_TARGET, "SLA below target", 503)
    return DashboardSlaProbeOut(
        dashboard_id=item.dashboard_id,
        uptime_percent=uptime,
        sla_target_percent=item.sla_target_percent,
        within_sla=within,
        window_hours=item.window_hours,
        sampled_at=datetime.now(UTC),
    )


def get_dashboard_sla_alerts() -> DashboardSlaAlertsOut:
    channels = _ALERTS["channels"]
    return DashboardSlaAlertsOut(
        enabled=_ALERTS["enabled"],
        channels=channels,
        threshold_percent=_ALERTS["thresholdPercent"],
        configured=bool(channels),
    )
