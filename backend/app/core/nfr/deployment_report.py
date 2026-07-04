from __future__ import annotations

import os
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from app.core.nfr.runtime_guard import RuntimeCheckItem, RuntimeComplianceReport, build_runtime_report

SCAN_BUDGET_MS = 100
REPORT_VERSION = "nfr08-deployment-v1"


@dataclass(frozen=True)
class DeploymentAcceptanceReport:
    report_version: str
    generated_at: str
    runtime: RuntimeComplianceReport
    acceptance_checklist: tuple[RuntimeCheckItem, ...]
    overall_acceptance: Literal["accepted", "rejected", "conditional"]
    ops_summary: str
    remediation_index: dict[str, str]


def build_deployment_acceptance_report(
    pyproject_text: str | None = None,
    *,
    mode: str | None = None,
) -> DeploymentAcceptanceReport:
    runtime = build_runtime_report(pyproject_text)
    mode = mode or os.environ.get("NFR08_RUNTIME_MODE", "permissive")
    extra = (
        RuntimeCheckItem("deployment-ready", "pass" if runtime.overall_status == "compliant" else "fail", "Runtime must be compliant for deployment"),
        RuntimeCheckItem("ci-gate-hint", "pass", "Set NFR08_RUNTIME_MODE=strict for CI gates"),
    )
    checklist = runtime.items + extra
    if runtime.overall_status == "compliant":
        overall: Literal["accepted", "rejected", "conditional"] = "accepted"
        ops = "Runtime compliance accepted; ready for deployment verification."
    elif mode == "strict":
        overall = "rejected"
        ops = "Runtime compliance rejected under strict mode; remediate before deploy."
    else:
        overall = "conditional"
        ops = "Runtime compliance conditional; review remediation_index before production."
    remediation = {i.id: i.remediation for i in checklist if i.remediation and i.status == "fail"}
    return DeploymentAcceptanceReport(
        report_version=REPORT_VERSION,
        generated_at=datetime.now(UTC).isoformat(),
        runtime=runtime,
        acceptance_checklist=checklist,
        overall_acceptance=overall,
        ops_summary=ops,
        remediation_index=remediation,
    )


def probe_deployment_report_budget_ms() -> float:
    start = time.perf_counter()
    build_deployment_acceptance_report("dependencies = []\n")
    return (time.perf_counter() - start) * 1000.0
