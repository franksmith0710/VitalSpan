from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from app.auth.deps import UserContext
from app.reports.catalog import service as catalog_service
from app.reports.catalog.errors import ReportCatalogError
from app.reports.errors import ReportExtensionError
from app.reports.extension.acl import assert_extension_action
from app.reports.extension.compare import build_compare_slots
from app.reports.extension.render import build_extension_render_spec
from app.reports.extension.schemas import ExtensionConfigOut, ExtensionConfigUpsert

_MAX_METRICS = 32
_MAX_FILTERS = 32
_VALID_OPERATORS = frozenset({"eq", "ne", "in", "between", "like"})
_VALID_COMPARE = frozenset({"none", "yoy", "mom"})
_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_store: dict[uuid.UUID, dict] = {}
_audit_log: list[dict] = []


def _assert_template_node(node_id: uuid.UUID) -> None:
    if not catalog_service.node_exists(node_id):
        raise ReportExtensionError("RPT_EXT_NODE_NOT_FOUND", "Catalog node not found", 404)
    try:
        node = catalog_service.get_node(node_id)
    except ReportCatalogError as exc:
        raise ReportExtensionError(exc.code, exc.message, exc.status) from exc
    if node.node_type != "template":
        raise ReportExtensionError(
            "RPT_EXT_INVALID_NODE_TYPE",
            "Extension config only allowed on template nodes",
            422,
        )


def _validate_compare_metrics(metrics: list) -> None:
    for m in metrics:
        mode = m.compare_mode
        if mode not in _VALID_COMPARE:
            raise ReportExtensionError(
                "RPT_EXT_INVALID_COMPARE",
                "Invalid compareMode",
                422,
                fields={"fields": ["compareMode"]},
            )
        if mode in {"yoy", "mom"} and not m.expression and not _KEY_RE.match(m.key):
            raise ReportExtensionError(
                "RPT_EXT_INVALID_COMPARE",
                "compare metric requires expression or valid key",
                422,
            )


def _validate_payload(payload: ExtensionConfigUpsert) -> None:
    if len(payload.metrics) > _MAX_METRICS:
        raise ReportExtensionError("RPT_EXT_METRICS_LIMIT", "Metrics limit exceeded", 422)
    if len(payload.filters) > _MAX_FILTERS:
        raise ReportExtensionError("RPT_EXT_FILTERS_LIMIT", "Filters limit exceeded", 422)
    metric_keys = [m.key for m in payload.metrics]
    if len(metric_keys) != len(set(metric_keys)):
        raise ReportExtensionError("RPT_EXT_DUPLICATE_KEY", "Duplicate metric key", 422)
    filter_keys = [f.key for f in payload.filters]
    if len(filter_keys) != len(set(filter_keys)):
        raise ReportExtensionError("RPT_EXT_DUPLICATE_KEY", "Duplicate filter key", 422)
    for filt in payload.filters:
        if filt.operator not in _VALID_OPERATORS:
            raise ReportExtensionError("RPT_EXT_INVALID_OPERATOR", "Invalid filter operator", 422)
    _validate_compare_metrics(payload.metrics)


def upsert(node_id: uuid.UUID, payload: ExtensionConfigUpsert, actor: UserContext) -> ExtensionConfigOut:
    assert_extension_action(actor, "write")
    _assert_template_node(node_id)
    if payload.catalog_node_id != node_id:
        raise ReportExtensionError("RPT_EXT_NODE_NOT_FOUND", "catalogNodeId mismatch", 404)
    _validate_payload(payload)
    prev = _store.get(node_id)
    revision = (prev["revision"] + 1) if prev else 1
    record = {
        "catalog_node_id": node_id,
        "metrics": [m.model_dump(by_alias=True) for m in payload.metrics],
        "filters": [f.model_dump(by_alias=True) for f in payload.filters],
        "change_note": payload.change_note,
        "revision": revision,
    }
    _store[node_id] = record
    if payload.change_note:
        _audit_log.append(
            {"nodeId": str(node_id), "changeNote": payload.change_note, "updatedAt": datetime.now(UTC).isoformat()}
        )
    return ExtensionConfigOut(revision=revision, **payload.model_dump())


def get_extension(node_id: uuid.UUID) -> ExtensionConfigOut:
    _assert_template_node(node_id)
    record = _store.get(node_id)
    if record is None:
        raise ReportExtensionError("RPT_EXT_NODE_NOT_FOUND", "Extension config not found", 404)
    return ExtensionConfigOut(
        catalog_node_id=node_id,
        metrics=record["metrics"],
        filters=record["filters"],
        change_note=record.get("change_note"),
        revision=record["revision"],
    )


def delete_extension(node_id: uuid.UUID, actor: UserContext) -> None:
    assert_extension_action(actor, "delete")
    _assert_template_node(node_id)
    if node_id not in _store:
        raise ReportExtensionError("RPT_EXT_NODE_NOT_FOUND", "Extension config not found", 404)
    del _store[node_id]


def compare_preview(node_id: uuid.UUID, compare_mode: str, metric_keys: list[str] | None) -> dict:
    _assert_template_node(node_id)
    record = _store.get(node_id) or {"metrics": []}
    slots = build_compare_slots(compare_mode, record.get("metrics", []), metric_keys)
    return {"slots": slots}


def list_revision_history(node_id: uuid.UUID) -> list[dict]:
    _assert_template_node(node_id)
    record = _store.get(node_id)
    if record is None:
        raise ReportExtensionError("RPT_EXT_NODE_NOT_FOUND", "Extension config not found", 404)
    entries = [e for e in _audit_log if e.get("nodeId") == str(node_id)]
    if not entries:
        return [{
            "revision": record["revision"],
            "changeNote": None,
            "updatedAt": datetime.now(UTC).isoformat(),
        }]
    return [
        {"revision": record["revision"], "changeNote": e["changeNote"], "updatedAt": e["updatedAt"]}
        for e in entries
    ]


def export_persistence_snapshot(node_id: uuid.UUID) -> dict:
    record = _store[node_id]
    return {
        "store": "memory",
        "revision": record["revision"],
        "metrics": record["metrics"],
        "filters": record["filters"],
        "auditEntryCount": sum(1 for e in _audit_log if e.get("nodeId") == str(node_id)),
    }


def get_render_spec(node_id: uuid.UUID) -> dict:
    _assert_template_node(node_id)
    record = _store.get(node_id)
    if record is None:
        raise ReportExtensionError("RPT_EXT_NODE_NOT_FOUND", "Extension config not found", 404)
    node = catalog_service.get_node(node_id)
    return build_extension_render_spec(record, node.template_kind)
