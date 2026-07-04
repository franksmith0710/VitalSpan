from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard import service as dash_service
from app.dashboard.global_filters.errors import GlobalFilterError
from app.dashboard.global_filters.schemas import GlobalFilterLinkageItem, GlobalFilterLinkageOut
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigError, ConfigUpsert

_REF_TYPE = "global_filter_linkage"
_CONFIG_TYPE = "global_filter_linkage"


def _assert_access(actor: UserContext, dashboard_created_by: uuid.UUID | None) -> None:
    if "admin" in actor.roles:
        return
    try:
        actor_uuid = uuid.UUID(actor.id)
    except ValueError:
        raise GlobalFilterError("DASH_FILTER_FORBIDDEN", "Access denied", 403) from None
    if dashboard_created_by is None or dashboard_created_by != actor_uuid:
        raise GlobalFilterError("DASH_FILTER_FORBIDDEN", "Access denied", 403)


def _widget_ids(session: Session, dashboard_id: uuid.UUID) -> set[str]:
    dashboard = dash_service.get_dashboard(session, dashboard_id)
    layout = dashboard.layout_json or {}
    widgets = layout.get("widgets") or []
    return {str(w.get("id")) for w in widgets if w.get("id")}


def _validate_linkage(session: Session, item: GlobalFilterLinkageItem) -> GlobalFilterLinkageItem:
    try:
        dash_service.get_dashboard(session, item.dashboard_id)
    except dash_service.DashboardError as exc:
        if exc.code == "DASH_NOT_FOUND":
            raise GlobalFilterError("DASH_FILTER_DASHBOARD_NOT_FOUND", "Dashboard not found", 404) from exc
        raise
    if not item.filters:
        raise GlobalFilterError(
            "DASH_FILTER_EMPTY_FILTERS",
            "At least one filter is required",
            422,
            [{"field": "filters", "message": "must not be empty"}],
        )
    filter_ids = [f.filter_id for f in item.filters]
    if len(filter_ids) != len(set(filter_ids)):
        raise GlobalFilterError("DASH_FILTER_DUPLICATE_ID", "Duplicate filterId", 422)
    known_filters = set(filter_ids)
    widget_ids = _widget_ids(session, item.dashboard_id)
    for rule in item.linkage_rules:
        if rule.source_filter_id not in known_filters:
            raise GlobalFilterError(
                "DASH_FILTER_UNKNOWN_SOURCE",
                f"Unknown sourceFilterId: {rule.source_filter_id}",
                422,
            )
        missing = [wid for wid in rule.target_widget_ids if wid not in widget_ids]
        if missing:
            raise GlobalFilterError(
                "DASH_FILTER_WIDGET_NOT_FOUND",
                f"Widget not in layout: {missing[0]}",
                422,
                [{"field": "targetWidgetIds", "message": f"unknown widget: {missing[0]}"}],
            )
    return item


def validate_linkage(session: Session, item: GlobalFilterLinkageItem) -> GlobalFilterLinkageItem:
    return _validate_linkage(session, item)


def save_linkage(session: Session, item: GlobalFilterLinkageItem, actor: UserContext) -> GlobalFilterLinkageOut:
    _validate_linkage(session, item)
    dashboard = dash_service.get_dashboard(session, item.dashboard_id)
    _assert_access(actor, dashboard.created_by)
    try:
        owner_id = uuid.UUID(actor.id)
    except ValueError:
        owner_id = None
    config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type=_CONFIG_TYPE,
            schema_version="1.0",
            ref_type=_REF_TYPE,
            ref_id=item.dashboard_id,
            payload=item.model_dump(by_alias=True, mode="json"),
        ),
        owner_id=owner_id,
    )
    return get_linkage(session, item.dashboard_id, actor)


def get_linkage(session: Session, dashboard_id: uuid.UUID, actor: UserContext) -> GlobalFilterLinkageOut:
    dashboard = dash_service.get_dashboard(session, dashboard_id)
    _assert_access(actor, dashboard.created_by)
    try:
        record = config_store.get_config_by_ref(session, _CONFIG_TYPE, _REF_TYPE, dashboard_id)
    except ConfigError as exc:
        raise GlobalFilterError("DASH_FILTER_NOT_FOUND", "Global filter linkage not configured", 404) from exc
    item = GlobalFilterLinkageItem.model_validate(record.payload)
    affected = sum(len(r.target_widget_ids) for r in item.linkage_rules)
    return GlobalFilterLinkageOut(**item.model_dump(), affected_widget_count=affected)
