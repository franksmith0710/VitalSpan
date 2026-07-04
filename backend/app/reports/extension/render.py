from __future__ import annotations

probe_extension_load_budget_ms: int = 50


def build_extension_render_spec(record: dict, template_kind: str | None) -> dict:
    visible_metrics = [m for m in record.get("metrics", []) if m.get("visible", True)]
    return {
        "templateNodeId": str(record["catalog_node_id"]),
        "revision": record["revision"],
        "templateKind": template_kind,
        "metrics": visible_metrics,
        "filters": record.get("filters", []),
        "renderVersion": "1.0",
    }
