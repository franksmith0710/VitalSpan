"""Apply template crosstab blocks to metric table sections."""

from __future__ import annotations

from typing import Any

from app.reports.engine.crosstab import pivot_table
from app.reports.persistence import template_repo


def _block_dicts(template_key: str) -> list[dict[str, Any]]:
    raw = template_repo.get_template(template_key)
    if not raw:
        return []
    return list(raw.get("blocks") or [])


def apply_crosstab_blocks(sections: list[dict[str, Any]], template_key: str | None) -> list[dict[str, Any]]:
    if not template_key:
        return sections
    blocks = [b for b in _block_dicts(template_key) if (b.get("blockType") or b.get("block_type")) == "crosstab"]
    if not blocks:
        return sections
    by_metric = {
        str(s.get("metricKey") or ""): s
        for s in sections
        if s.get("kind") == "table" and s.get("metricKey")
    }
    out: list[dict[str, Any]] = []
    used: set[str] = set()
    for block in blocks:
        ref = str(block.get("tableRef") or block.get("table_ref") or "").strip()
        if not ref or ref not in by_metric:
            continue
        src = by_metric[ref]
        used.add(ref)
        out.append(
            pivot_table(
                list(src.get("columns") or []),
                list(src.get("rows") or []),
                row_field=str(block.get("rowField") or block.get("row_field") or ""),
                col_field=str(block.get("colField") or block.get("col_field") or ""),
                value_field=str(block.get("valueField") or block.get("value_field") or ""),
                agg=str(block.get("agg") or "sum"),  # type: ignore[arg-type]
            )
            | {"metricKey": ref, "title": block.get("title") or src.get("title") or ref}
        )
    for section in sections:
        key = str(section.get("metricKey") or "")
        if section.get("kind") == "table" and key in used:
            continue
        out.append(section)
    return out if out else sections
