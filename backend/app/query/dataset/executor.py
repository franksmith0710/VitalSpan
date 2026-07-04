from __future__ import annotations

import time

from app.query.dataset.guard import validate_dataset_spec
from app.query.dataset.schemas import DatasetExecutePlanOut, DatasetQuerySpec, ExecutePlanStep
from app.query.schemas import QueryError

_FORBIDDEN_PARAM_KEYS = frozenset({"__proto__", "_sql"})
_EXECUTE_PLAN_BUDGET_MS = 30


def _assert_safe_params(params: dict) -> None:
    for key in params:
        if key in _FORBIDDEN_PARAM_KEYS or key.startswith("__"):
            raise QueryError("QUERY_DATASET_PLAN_INVALID_PARAMS", "Forbidden parameter key", 422)


def build_dataset_execute_plan(raw: dict, roles: list[str]) -> DatasetExecutePlanOut:
    validated = validate_dataset_spec(raw, roles)
    spec = DatasetQuerySpec.model_validate(raw)
    _assert_safe_params(spec.parameters)
    steps = [
        ExecutePlanStep(step="path_resolve", status="pass", detail="dataset path resolved"),
        ExecutePlanStep(step="acl_check", status="pass", detail="ACL passed"),
        ExecutePlanStep(step="readonly_guard", status="pass", detail="readonly select only"),
        ExecutePlanStep(step="plan_ready", status="pass", detail="stub plan ready"),
    ]
    return DatasetExecutePlanOut(
        datasetId=validated.dataset_id,
        resolvedPath="dataset",
        readonly=True,
        steps=steps,
    )


def probe_execute_plan_budget_ms(raw: dict, roles: list[str]) -> float:
    start = time.perf_counter()
    build_dataset_execute_plan(raw, roles)
    return (time.perf_counter() - start) * 1000.0
