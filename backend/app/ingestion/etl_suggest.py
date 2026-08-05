"""根据源表列元数据生成建议 ETL 清洗规则。"""

from __future__ import annotations

import re
from typing import Any, TypedDict


class EtlColumnMeta(TypedDict, total=False):
    name: str
    dataType: str


NUMERIC_FLOAT_NAME = re.compile(
    r"(?:^|_)(amount|price|qty|quantity|total|cost|rate|weight|budget|spent|"
    r"revenue|salary|fee|value|score|lat|lng|lon|latitude|longitude)(?:$|_)",
    re.IGNORECASE,
)
NUMERIC_INT_NAME = re.compile(
    r"(?:^|_)(id|year|month|day|age|rank|seq|index|count|num)(?:$|_)",
    re.IGNORECASE,
)
RENAME_NAME_SUFFIX = re.compile(r"^([a-z][a-z0-9_]*)_name$", re.IGNORECASE)
FILL_NULL_NAME = re.compile(r"(?:^|_)(note|comment|remark|memo)(?:$|_)", re.IGNORECASE)
FILL_NULL_DEFAULT = "无备注"


def _is_string_like_data_type(data_type: str | None) -> bool:
    dt = (data_type or "").lower()
    if not dt:
        return True
    return bool(re.search(r"char|text|json|blob|string|enum|set", dt))


def suggest_etl_rules_from_columns(columns: list[EtlColumnMeta]) -> list[dict[str, Any]]:
    """根据源表列元数据生成建议清洗规则（rename / fill_null / cast / status 过滤）。"""
    rules: list[dict[str, Any]] = []
    seen: set[str] = set()

    for col in columns:
        name = (col.get("name") or "").strip()
        if not name:
            continue

        rename_match = RENAME_NAME_SUFFIX.match(name)
        if rename_match:
            target = rename_match.group(1)
            key = f"rename:{name}"
            if key not in seen and target != name:
                seen.add(key)
                rules.append({"type": "rename_column", "from": name, "to": target})

        if FILL_NULL_NAME.search(name):
            key = f"fill:{name}"
            if key not in seen:
                seen.add(key)
                rules.append({"type": "fill_null", "column": name, "value": FILL_NULL_DEFAULT})

        if not _is_string_like_data_type(col.get("dataType")):
            continue

        target: str | None = None
        if NUMERIC_INT_NAME.search(name):
            target = "integer"
        elif NUMERIC_FLOAT_NAME.search(name):
            target = "float"
        if target:
            key = f"cast:{name}"
            if key not in seen:
                seen.add(key)
                rules.append({"type": "cast_type", "column": name, "to": target})

    if any((col.get("name") or "").strip().lower() == "status" for col in columns):
        rules.append({"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"})

    return rules
