from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.reports.persistence import standard_repo
from app.reports.standard.errors import RPT_STD_SNAPSHOT_NOT_FOUND, StandardAnalysisError
from app.reports.standard.schemas import CompareDeltaRow, CompareOut, RunIn
from app.reports.standard import service as pack_service


def _column_name(col: object) -> str:
    if isinstance(col, dict):
        return str(col.get("name") or col.get("key") or "")
    return str(col)


def _rows_to_map(payload: dict) -> dict[str, float]:
    rows = payload.get("rows") or []
    columns = payload.get("columns") or []
    if not rows or not columns:
        return {}
    key_col = _column_name(columns[0]) or "dim"
    val_col = _column_name(columns[1]) if len(columns) > 1 else "cnt"
    out: dict[str, float] = {}
    for row in rows:
        if isinstance(row, dict):
            k = str(row.get(key_col, row.get("dim", "")))
            v = row.get(val_col, row.get("cnt", 0))
        elif isinstance(row, (list, tuple)) and len(row) >= 2:
            k, v = str(row[0]), row[1]
        else:
            continue
        try:
            out[k] = float(v)
        except (TypeError, ValueError):
            out[k] = 0.0
    return out


def compare_pack(
    db: Session,
    pack_key: str,
    theme: str,
    user: UserContext,
) -> CompareOut:
    pack = pack_service.get_pack(pack_key, user)
    if theme not in pack.enabled_themes:
        raise StandardAnalysisError("RPT_STD_THEME_DISABLED", "theme not enabled", 422)
    run_out = pack_service.run_pack(db, pack_key, RunIn(theme=theme), user)
    current_payload = (run_out.render_spec.get("sections") or [{}])[0]
    current_payload = {
        "columns": current_payload.get("columns") or [],
        "rows": current_payload.get("rows") or [],
    }
    period_kind, current_key = pack_service.period_key_for(pack.snapshot_cron_preset)
    previous_key = pack_service.previous_period_key(period_kind, current_key)
    previous_raw = (
        standard_repo.get_snapshot_for_period(pack_key, theme, period_kind, previous_key)
        if previous_key
        else None
    )
    previous_payload = previous_raw.get("payload") if previous_raw else None
    current_map = _rows_to_map(current_payload)
    previous_map = _rows_to_map(previous_payload) if previous_payload else {}
    deltas: list[CompareDeltaRow] = []
    all_keys = sorted(set(current_map) | set(previous_map))
    for k in all_keys:
        cur = current_map.get(k, 0.0)
        prev = previous_map.get(k) if k in previous_map else None
        delta = cur - prev if prev is not None else None
        delta_pct = (delta / prev * 100) if prev not in (None, 0) and delta is not None else None
        deltas.append(
            CompareDeltaRow(
                key=k,
                currentValue=cur,
                previousValue=prev,
                delta=delta,
                deltaPct=delta_pct,
            )
        )
    if previous_payload is None and previous_key:
        return CompareOut(
            packKey=pack_key,
            theme=theme,
            currentPeriodKey=current_key,
            previousPeriodKey=previous_key,
            current=current_payload,
            previous=None,
            deltas=deltas,
        )
    return CompareOut(
        packKey=pack_key,
        theme=theme,
        currentPeriodKey=current_key,
        previousPeriodKey=previous_key,
        current=current_payload,
        previous=previous_payload,
        deltas=deltas,
    )
