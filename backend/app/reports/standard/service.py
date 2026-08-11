from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.metadata.physical import service as physical_service
from app.metadata.physical.errors import PhysicalTableError
from app.reports.engine import execute as engine_execute
from app.reports.standard.errors import (
    RPT_STD_EMPTY_ROLES,
    RPT_STD_FIELD_MAPPING,
    RPT_STD_FORBIDDEN,
    RPT_STD_KEY_MISMATCH,
    RPT_STD_NOT_FOUND,
    RPT_STD_TABLE_NOT_FOUND,
    RPT_STD_THEME_DISABLED,
    RPT_STD_THEME_UNSUPPORTED,
    StandardAnalysisError,
)
from app.reports.standard.schemas import (
    AnalysisPackIn,
    AnalysisPackListResponse,
    AnalysisPackOut,
    CapabilitiesOut,
    FieldMapping,
    RunIn,
    RunOut,
    ThemeType,
)
from app.reports.standard.capabilities import evaluate_capabilities
from app.reports.persistence import standard_repo


def _assert_read_access(user: UserContext, allowed_roles: list[str]) -> None:
    if not set(user.roles).intersection(set(allowed_roles)):
        raise StandardAnalysisError(RPT_STD_FORBIDDEN, "role not allowed to access analysis pack", 403)


def _assert_write_access(user: UserContext) -> None:
    if set(user.roles) <= {"viewer"}:
        raise StandardAnalysisError(RPT_STD_FORBIDDEN, "viewer cannot manage analysis packs", 403)


def _validate_pack(payload: AnalysisPackIn) -> AnalysisPackIn:
    if not payload.allowed_roles:
        raise StandardAnalysisError(RPT_STD_EMPTY_ROLES, "allowedRoles must not be empty", 422)
    try:
        physical_service.get_physical_table(payload.physical_table_fqn)
    except PhysicalTableError as exc:
        raise StandardAnalysisError(RPT_STD_TABLE_NOT_FOUND, exc.message, 404) from exc
    caps = evaluate_capabilities(payload.field_mapping, _load_columns(payload.physical_table_fqn))
    for theme in payload.enabled_themes:
        cap = next((c for c in caps if c.theme == theme), None)
        if cap is None or not cap.available:
            raise StandardAnalysisError(
                RPT_STD_THEME_DISABLED,
                f"theme {theme} not available for field mapping",
                422,
            )
    return payload


def _load_columns(table_fqn: str) -> list[dict]:
    pt = physical_service.get_physical_table(table_fqn)
    return [c.model_dump(by_alias=True) for c in pt.columns]


def list_packs(user: UserContext) -> AnalysisPackListResponse:
    items = []
    for raw in standard_repo.all_packs().values():
        pack = AnalysisPackOut.model_validate(raw)
        if set(user.roles).intersection(set(pack.allowed_roles)):
            items.append(pack)
    return AnalysisPackListResponse(items=items, total=len(items))


def get_pack(key: str, user: UserContext) -> AnalysisPackOut:
    raw = standard_repo.get_pack(key)
    if raw is None:
        raise StandardAnalysisError(RPT_STD_NOT_FOUND, "Analysis pack not found", 404)
    pack = AnalysisPackOut.model_validate(raw)
    _assert_read_access(user, pack.allowed_roles)
    return pack


def upsert_pack(key: str, payload: AnalysisPackIn, user: UserContext) -> AnalysisPackOut:
    _assert_write_access(user)
    if key != payload.pack_key:
        raise StandardAnalysisError(RPT_STD_KEY_MISMATCH, "path packKey mismatch", 422)
    item = _validate_pack(payload)
    standard_repo.save_pack(key, item.model_dump(by_alias=True, mode="json"))
    from app.reports.standard.jobs import refresh_standard_snapshot_jobs

    refresh_standard_snapshot_jobs()
    return AnalysisPackOut.model_validate(standard_repo.get_pack(key))


def delete_pack(key: str, user: UserContext) -> None:
    _assert_write_access(user)
    if standard_repo.get_pack(key) is None:
        raise StandardAnalysisError(RPT_STD_NOT_FOUND, "Analysis pack not found", 404)
    standard_repo.delete_pack(key)
    from app.reports.standard.jobs import refresh_standard_snapshot_jobs

    refresh_standard_snapshot_jobs()


def get_capabilities(key: str, user: UserContext) -> CapabilitiesOut:
    pack = get_pack(key, user)
    columns = _load_columns(pack.physical_table_fqn)
    themes = evaluate_capabilities(pack.field_mapping, columns, pack.enabled_themes)
    return CapabilitiesOut(
        packKey=pack.pack_key,
        themes=themes,
        columns=[c.get("name", "") for c in columns],
    )


def _resolve_table_ref(table_fqn: str) -> str:
    pt = physical_service.get_physical_table(table_fqn)
    if pt.source_schema and pt.source_table:
        return f"{pt.source_schema}.{pt.source_table}"
    return table_fqn.split(".", 1)[-1]


def _build_sql(theme: ThemeType, table_ref: str, mapping: FieldMapping) -> str:
    if theme == "lifecycle":
        col = mapping.status
        if not col:
            raise StandardAnalysisError(RPT_STD_FIELD_MAPPING, "status mapping required", 422)
        return f"SELECT {col} AS dim, COUNT(*) AS cnt FROM {table_ref} GROUP BY {col}"
    if theme == "distribution":
        col = mapping.region
        if not col:
            raise StandardAnalysisError(RPT_STD_FIELD_MAPPING, "region mapping required", 422)
        return f"SELECT {col} AS dim, COUNT(*) AS cnt FROM {table_ref} GROUP BY {col}"
    col = mapping.created_at
    if not col:
        raise StandardAnalysisError(RPT_STD_FIELD_MAPPING, "createdAt mapping required", 422)
    if theme == "activity":
        return f"SELECT DATE({col}) AS d, COUNT(*) AS cnt FROM {table_ref} GROUP BY 1 ORDER BY 1"
    if theme == "trend":
        return (
            f"SELECT DATE({col}) AS d, COUNT(*) AS cnt FROM {table_ref} "
            f"GROUP BY 1 ORDER BY 1 LIMIT 30"
        )
    raise StandardAnalysisError(RPT_STD_THEME_UNSUPPORTED, f"unsupported theme={theme}", 422)


def run_pack(db: Session, key: str, payload: RunIn, user: UserContext) -> RunOut:
    pack = get_pack(key, user)
    if payload.theme not in pack.enabled_themes:
        raise StandardAnalysisError(RPT_STD_THEME_DISABLED, "theme not enabled for pack", 422)
    table_ref = _resolve_table_ref(pack.physical_table_fqn)
    sql = _build_sql(payload.theme, table_ref, pack.field_mapping)
    section_payload = engine_execute.execute_section(
        db, user, pack.data_source_id, sql, limit=payload.limit
    )
    chart_type = (
        "bar"
        if payload.theme == "distribution"
        else "line"
        if payload.theme in {"activity", "trend"}
        else None
    )
    section: dict = {
        "kind": "chart" if chart_type else "table",
        "columns": section_payload["columns"],
        "rows": section_payload["rows"],
        "placeholder": False,
    }
    if chart_type:
        section["chartType"] = chart_type
    render_spec = {
        "engineVersion": "1.0",
        "format": "web",
        "sections": [section],
        "parameters": payload.parameters,
    }
    return RunOut(
        packKey=pack.pack_key,
        theme=payload.theme,
        renderSpec=render_spec,
        dataSourceId=pack.data_source_id,
        status="ready",
    )


def period_key_for(preset: str, at: datetime | None = None) -> tuple[str, str]:
    now = at or datetime.now(UTC)
    if preset == "daily":
        return "daily", now.strftime("%Y-%m-%d")
    if preset == "weekly":
        iso = now.isocalendar()
        return "weekly", f"{iso.year}-W{iso.week:02d}"
    if preset == "monthly":
        return "monthly", now.strftime("%Y-%m")
    return "daily", now.strftime("%Y-%m-%d")


def previous_period_key(period_kind: str, period_key: str) -> str | None:
    if period_kind == "daily":
        dt = datetime.strptime(period_key, "%Y-%m-%d").replace(tzinfo=UTC)
        return (dt - timedelta(days=1)).strftime("%Y-%m-%d")
    if period_kind == "weekly":
        year_str, week_str = period_key.split("-W")
        year, week = int(year_str), int(week_str)
        dt = datetime.fromisocalendar(year, week, 1).replace(tzinfo=UTC)
        prev = dt - timedelta(weeks=1)
        iso = prev.isocalendar()
        return f"{iso.year}-W{iso.week:02d}"
    if period_kind == "monthly":
        year_str, month_str = period_key.split("-")
        year, month = int(year_str), int(month_str)
        if month == 1:
            return f"{year - 1}-12"
        return f"{year}-{month - 1:02d}"
    return None
