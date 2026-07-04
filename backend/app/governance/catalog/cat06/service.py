from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC, datetime

from app.auth.deps import UserContext
from app.governance.catalog.cat06.errors import CAT06_EMPTY_METRICS, Cat06Error
from app.governance.catalog.cat06.schemas import (
    ProductionStatsItemIn,
    ProductionStatsItemOut,
    ProductionStatsListResponse,
    ProductionStatsProbeOut,
    ProductionStatsValidateOut,
)

_VALID_VENDOR = frozenset({"enterprise", "scheme", "model", "dcas"})
_store: dict[str, dict] = {}
_USER_BRAND_SCOPE: dict[str, str] = {}
probe_production_stats_budget_ms_limit = 50


@dataclass(frozen=True)
class Cat06ProbeResult:
    elapsed_ms: float
    ok: bool


def set_user_brand_scope(user_id: str, brand_id: str) -> None:
    _USER_BRAND_SCOPE[user_id] = brand_id


def _assert_brand_access(user: UserContext, brand_id: str) -> None:
    roles = set(user.roles)
    if "enterprise" in roles and not roles.intersection({"admin", "analyst"}):
        expected = _USER_BRAND_SCOPE.get(user.id, "BRAND01")
        if brand_id != expected:
            raise Cat06Error(
                "CAT06_BRAND_FORBIDDEN",
                f"enterprise user cannot access brand {brand_id}",
                403,
            )


def _validate_payload(payload: ProductionStatsItemIn) -> ProductionStatsItemIn:
    if payload.vendor_type not in _VALID_VENDOR:
        raise Cat06Error(
            "CAT06_INVALID_VENDOR",
            "Invalid vendorType",
            422,
            [{"field": "vendorType", "message": "invalid"}],
        )
    if not payload.metric_keys:
        raise Cat06Error(
            CAT06_EMPTY_METRICS,
            "metricKeys must not be empty",
            422,
            [{"field": "metricKeys", "message": "must not be empty"}],
        )
    return payload


def validate_production_stats(payload: ProductionStatsItemIn) -> ProductionStatsValidateOut:
    item = _validate_payload(payload)
    return ProductionStatsValidateOut(valid=True, stats_key=item.stats_key)


def create_production_stats(payload: ProductionStatsItemIn, user: UserContext) -> ProductionStatsItemOut:
    item = _validate_payload(payload)
    _assert_brand_access(user, item.brand_id)
    if item.stats_key in _store:
        raise Cat06Error("CAT06_KEY_CONFLICT", f"statsKey already exists: {item.stats_key}", 409)
    _store[item.stats_key] = item.model_dump(by_alias=True, mode="json")
    return ProductionStatsItemOut.model_validate(_store[item.stats_key])


def list_production_stats(user: UserContext, limit: int, offset: int) -> ProductionStatsListResponse:
    roles = set(user.roles)
    items = list(_store.values())
    if "enterprise" in roles and not roles.intersection({"admin", "analyst"}):
        expected = _USER_BRAND_SCOPE.get(user.id, "BRAND01")
        items = [i for i in items if i.get("brandId") == expected]
    page = items[offset : offset + limit]
    return ProductionStatsListResponse(
        items=[ProductionStatsItemOut.model_validate(i) for i in page],
        total=len(items),
    )


def get_production_stats(key: str, user: UserContext) -> ProductionStatsProbeOut:
    if key not in _store:
        raise Cat06Error("CAT06_NOT_FOUND", f"statsKey not found: {key}", 404)
    brand_id = _store[key]["brandId"]
    _assert_brand_access(user, brand_id)
    return ProductionStatsProbeOut(
        inbound=120,
        inventory=85,
        opened=40,
        activated=22,
        sampled_at=datetime.now(UTC),
    )


def probe_production_stats_budget_ms(key: str) -> Cat06ProbeResult:
    started = time.perf_counter()
    admin = UserContext(id="probe", username="probe", roles=["admin"])
    get_production_stats(key, admin)
    elapsed = (time.perf_counter() - started) * 1000
    return Cat06ProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_production_stats_budget_ms_limit)


def probe_validate_production_stats_budget_ms() -> Cat06ProbeResult:
    started = time.perf_counter()
    sample = ProductionStatsItemIn.model_validate({
        "statsKey": "PS_PROBE",
        "displayName": "Probe",
        "vendorType": "enterprise",
        "brandId": "BRAND01",
        "locType": "all",
        "metricKeys": ["inbound"],
    })
    validate_production_stats(sample)
    elapsed = (time.perf_counter() - started) * 1000
    return Cat06ProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_production_stats_budget_ms_limit)
