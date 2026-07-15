from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def _cast_value(value: Any, to: str) -> Any:
    if value is None or (isinstance(value, float) and np.isnan(value)):
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
            parsed = pd.to_numeric(value, errors="coerce")
            if pd.isna(parsed):
                return None
            return float(parsed)
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


def _records_from_df(df: pd.DataFrame) -> list[dict[str, Any]]:
    if df.empty:
        return []
    records = df.to_dict(orient="records")
    for row in records:
        for key, val in list(row.items()):
            if isinstance(val, float) and np.isnan(val):
                row[key] = None
            elif val is pd.NA:
                row[key] = None
    return records


def _apply_rename(df: pd.DataFrame, rule: dict[str, Any]) -> pd.DataFrame:
    src, dst = rule.get("from"), rule.get("to")
    if not src or not dst or src not in df.columns:
        return df
    return df.rename(columns={src: dst})


def _apply_cast(df: pd.DataFrame, rule: dict[str, Any]) -> pd.DataFrame:
    col, to = rule["column"], rule["to"]
    if col not in df.columns:
        return df
    df = df.copy()
    df[col] = df[col].map(lambda v: _cast_value(v, to))
    return df


def _apply_fill_null(df: pd.DataFrame, rule: dict[str, Any]) -> pd.DataFrame:
    col, val = rule["column"], rule["value"]
    if col not in df.columns:
        return df
    df = df.copy()
    series = df[col].replace("", np.nan)
    df[col] = series.where(series.notna(), val)
    return df


def _apply_filter(df: pd.DataFrame, rule: dict[str, Any]) -> pd.DataFrame:
    col, op, val = rule["column"], rule["op"], rule.get("value")
    if col not in df.columns:
        return df
    if op == "eq":
        return df[df[col] == val]
    if op == "ne":
        return df[df[col] != val]
    if op == "is_null":
        return df[df[col].isna() | (df[col] == "")]
    if op == "is_not_null":
        return df[df[col].notna() & (df[col] != "")]
    records = _records_from_df(df)
    kept = [row for row in records if _match_filter(row, col, op, val)]
    return pd.DataFrame(kept) if kept else pd.DataFrame(columns=df.columns)


def apply_rules(rows: list[dict[str, Any]], rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    df = pd.DataFrame(rows)
    for rule in rules:
        rtype = rule.get("type")
        if rtype == "rename_column":
            df = _apply_rename(df, rule)
        elif rtype == "cast_type":
            df = _apply_cast(df, rule)
        elif rtype == "fill_null":
            df = _apply_fill_null(df, rule)
        elif rtype == "filter_rows":
            df = _apply_filter(df, rule)
    return _records_from_df(df)
