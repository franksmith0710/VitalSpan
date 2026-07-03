from __future__ import annotations

from typing import Any


def _cast_value(value: Any, to: str) -> Any:
    if value is None:
        return None
    try:
        if to == "integer":
            s = str(value).strip()
            as_float = float(s)
            as_int = int(as_float)
            if as_float != as_int:
                return None
            if s.lstrip("+-").isdigit() and str(as_int) != s.lstrip("+"):
                return None
            return as_int
        if to == "float":
            return float(str(value))
        if to == "boolean":
            return str(value).lower() in {"1", "true", "yes", "y"}
        return str(value)
    except (TypeError, ValueError):
        return None


def _match_filter(row: dict[str, Any], column: str, op: str, value: Any) -> bool:
    cell = row.get(column)
    if op == "eq":
        return cell == value
    if op == "ne":
        return cell != value
    if op == "is_null":
        return cell is None or cell == ""
    if op == "is_not_null":
        return cell is not None and cell != ""
    return True


def apply_rules(rows: list[dict[str, Any]], rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = [dict(row) for row in rows]
    for rule in rules:
        rtype = rule.get("type")
        if rtype == "rename_column":
            src, dst = rule.get("from"), rule.get("to")
            if not src or not dst:
                continue
            for row in output:
                if src in row:
                    row[dst] = row.pop(src)
        elif rtype == "cast_type":
            col, to = rule["column"], rule["to"]
            for row in output:
                if col in row:
                    row[col] = _cast_value(row[col], to)
        elif rtype == "fill_null":
            col, val = rule["column"], rule["value"]
            for row in output:
                if row.get(col) is None or row.get(col) == "":
                    row[col] = val
        elif rtype == "filter_rows":
            col, op, val = rule["column"], rule["op"], rule.get("value")
            output = [row for row in output if _match_filter(row, col, op, val)]
    return output
