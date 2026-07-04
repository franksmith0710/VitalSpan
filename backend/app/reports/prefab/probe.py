from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from app.reports.prefab import service as prefab_service
from app.reports.prefab.schemas import PrefabBindingIn

probe_prefab_budget_ms_limit = 50


@dataclass(frozen=True)
class PrefabProbeResult:
    elapsed_ms: float
    ok: bool


def _sample_binding() -> PrefabBindingIn:
    return PrefabBindingIn.model_validate({
        "bindingKey": f"bind-probe-{uuid.uuid4().hex[:6]}",
        "entityTypeCode": "customer",
        "analysisType": "lifecycle",
        "dimensionCodes": ["region"],
        "displayName": "Probe Binding",
        "allowedRoles": ["analyst"],
    })


def probe_validate_prefab_budget_ms() -> PrefabProbeResult:
    started = time.perf_counter()
    prefab_service.validate_prefab_binding(_sample_binding())
    elapsed = (time.perf_counter() - started) * 1000
    return PrefabProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_prefab_budget_ms_limit)


def probe_list_prefab_bindings_budget_ms() -> PrefabProbeResult:
    started = time.perf_counter()
    prefab_service.list_prefab_bindings()
    elapsed = (time.perf_counter() - started) * 1000
    return PrefabProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_prefab_budget_ms_limit)
