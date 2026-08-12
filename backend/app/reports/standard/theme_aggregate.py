"""标准分析包主题聚合（Dataset 出数后在内存聚合，替代手写 SQL）。"""

from __future__ import annotations

from typing import Any

import pandas as pd

from app.reports.standard.errors import RPT_STD_FIELD_MAPPING, RPT_STD_THEME_UNSUPPORTED, StandardAnalysisError
from app.reports.standard.schemas import FieldMapping, ThemeType


def aggregate_pack_theme(
    theme: ThemeType,
    columns: list[str],
    rows: list[list[Any]],
    mapping: FieldMapping,
) -> tuple[list[str], list[list[Any]]]:
    if not rows:
        return columns, rows
    df = pd.DataFrame(rows, columns=columns)
    if theme == "lifecycle":
        col = mapping.status
        if not col or col not in df.columns:
            raise StandardAnalysisError(RPT_STD_FIELD_MAPPING, "status mapping required", 422)
        out = df.groupby(col, dropna=False).size().reset_index(name="cnt")
        out.columns = ["dim", "cnt"]
        return list(out.columns), out.values.tolist()
    if theme == "distribution":
        col = mapping.region
        if not col or col not in df.columns:
            raise StandardAnalysisError(RPT_STD_FIELD_MAPPING, "region mapping required", 422)
        out = df.groupby(col, dropna=False).size().reset_index(name="cnt")
        out.columns = ["dim", "cnt"]
        return list(out.columns), out.values.tolist()
    col = mapping.created_at
    if not col or col not in df.columns:
        raise StandardAnalysisError(RPT_STD_FIELD_MAPPING, "createdAt mapping required", 422)
    series = pd.to_datetime(df[col], errors="coerce")
    df = df.assign(_d=series.dt.date)
    out = df.groupby("_d", dropna=False).size().reset_index(name="cnt")
    out["_d"] = out["_d"].astype(str)
    out.columns = ["d", "cnt"]
    if theme == "trend":
        out = out.sort_values("d").head(30)
    elif theme != "activity":
        raise StandardAnalysisError(RPT_STD_THEME_UNSUPPORTED, f"unsupported theme={theme}", 422)
    return list(out.columns), out.values.tolist()
