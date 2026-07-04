from __future__ import annotations

from app.governance.catalog.cat02.errors import (
    CAT02_EMPTY_DIMENSIONS,
    CAT02_EMPTY_METRICS,
    CAT02_INVALID_AGGREGATION,
    CAT02_KEY_CONFLICT,
    CAT02_NOT_FOUND,
    Cat02Error,
)
from app.governance.catalog.cat02.schemas import (
    AggregateAttributionOut,
    AggregateTemplateIn,
    AggregateTemplateOut,
    AggregateTemplateValidateOut,
)

_VALID_FN = frozenset({"sum", "avg", "count"})
_store: dict[str, dict] = {}


def _validate_payload(payload: AggregateTemplateIn) -> AggregateTemplateIn:
    if not payload.dimensions:
        raise Cat02Error(CAT02_EMPTY_DIMENSIONS, "dimensions must not be empty", 422)
    if not payload.metrics:
        raise Cat02Error(CAT02_EMPTY_METRICS, "metrics must not be empty", 422)
    if payload.aggregation_fn not in _VALID_FN:
        raise Cat02Error(CAT02_INVALID_AGGREGATION, "invalid aggregationFn", 422)
    if not payload.attribution_label or not payload.attribution_label.strip():
        raise Cat02Error("CAT02_ATTRIBUTION_REQUIRED", "attributionLabel is required", 422)
    return payload


def validate_aggregate_template(payload: AggregateTemplateIn) -> AggregateTemplateValidateOut:
    item = _validate_payload(payload)
    return AggregateTemplateValidateOut(valid=True, aggregate_key=item.aggregate_key)


def create_aggregate_template(payload: AggregateTemplateIn) -> AggregateTemplateOut:
    item = _validate_payload(payload)
    key = item.aggregate_key
    if key in _store:
        raise Cat02Error(CAT02_KEY_CONFLICT, f"aggregateKey already exists: {key}", 409)
    _store[key] = item.model_dump(by_alias=True, mode="json")
    return AggregateTemplateOut.model_validate(_store[key])


def get_aggregate_attribution(aggregate_key: str) -> AggregateAttributionOut:
    row = _store.get(aggregate_key)
    if row is None:
        raise Cat02Error(CAT02_NOT_FOUND, f"aggregateKey not found: {aggregate_key}", 404)
    return AggregateAttributionOut(
        aggregateKey=row["aggregateKey"],
        attributionLabel=row["attributionLabel"],
        dimensions=row["dimensions"],
        metrics=row["metrics"],
        aggregationFn=row["aggregationFn"],
        pocReady=True,
    )
