from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.core.nfr.errors import (
    REPORT_PERF_BUDGET_OUT_OF_RANGE,
    REPORT_PERF_REPORT_REQUIRED,
    REPORT_PERF_SAMPLE_OUT_OF_RANGE,
)


class ReportPerfError(Exception):
    def __init__(self, code: str, message: str, status: int = 422, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)


class ReportPerfProbeIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    report_id: str = Field(default="", alias="reportId", max_length=128)
    sample_query_id: str | None = Field(default=None, alias="sampleQueryId", max_length=64)
    budget_ms: int = Field(default=10000, alias="budgetMs")
    sample_rows: int = Field(default=100, alias="sampleRows")


class ReportPerfValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    valid: bool
    report_id: str = Field(alias="reportId")
    budget_ms: int = Field(alias="budgetMs")


class ReportPerfProbeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    report_id: str = Field(alias="reportId")
    elapsed_ms: int = Field(alias="elapsedMs")
    within_budget: bool = Field(alias="withinBudget")
    sample_passed: bool = Field(alias="samplePassed")
    budget_ms: int = Field(alias="budgetMs")

_MOCK_ELAPSED_MS = 120


def _guard_config(payload: ReportPerfProbeIn) -> ReportPerfProbeIn:
    if not payload.report_id or not payload.report_id.strip():
        raise ReportPerfError(
            REPORT_PERF_REPORT_REQUIRED,
            "reportId is required",
            422,
            [{"field": "reportId", "message": "required"}],
        )
    if payload.budget_ms < 1000 or payload.budget_ms > 30000:
        raise ReportPerfError(REPORT_PERF_BUDGET_OUT_OF_RANGE, "budgetMs out of range", 422)
    if payload.sample_rows < 1 or payload.sample_rows > 1000:
        raise ReportPerfError(REPORT_PERF_SAMPLE_OUT_OF_RANGE, "sampleRows out of range", 422)
    return payload


def validate_report_perf_config(payload: ReportPerfProbeIn) -> ReportPerfValidateOut:
    item = _guard_config(payload)
    return ReportPerfValidateOut(valid=True, report_id=item.report_id, budget_ms=item.budget_ms)


def probe_report_perf(payload: ReportPerfProbeIn) -> ReportPerfProbeOut:
    item = _guard_config(payload)
    within = _MOCK_ELAPSED_MS <= item.budget_ms
    return ReportPerfProbeOut(
        report_id=item.report_id,
        elapsed_ms=_MOCK_ELAPSED_MS,
        within_budget=within,
        sample_passed=True,
        budget_ms=item.budget_ms,
    )
