from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.dashboard.schemas import DashboardLayout
from app.dashboard import service as dash_service
from app.dashboard.global_filters import service as global_filter_service
from app.dashboard.global_filters.errors import GlobalFilterError
from app.query.schemas import ExecuteRequest, ExecuteResponse
from app.query import service as query_service
from app.query.sql_parameters import build_widget_filter_params, inject_sql_parameters


def _find_widget(layout_json: DashboardLayout | dict, widget_id: str) -> dict:
    if isinstance(layout_json, DashboardLayout):
        for widget in layout_json.widgets:
            if str(widget.id) == widget_id:
                return widget.model_dump(by_alias=True, mode="json")
        raise GlobalFilterError("DASH_FILTER_WIDGET_NOT_FOUND", f"Widget not found: {widget_id}", 404)
    for widget in layout_json.get("widgets") or []:
        if str(widget.get("id")) == widget_id:
            return widget
    raise GlobalFilterError("DASH_FILTER_WIDGET_NOT_FOUND", f"Widget not found: {widget_id}", 404)


def execute_widget_with_filters(
    session: Session,
    dashboard_id: uuid.UUID,
    widget_id: str,
    filter_values: dict[str, str],
    actor: UserContext,
) -> ExecuteResponse:
    dashboard = dash_service.get_dashboard(session, dashboard_id)
    widget = _find_widget(dashboard.layout_json, widget_id)
    chart = widget.get("chartConfig") or {}
    linkage_item = global_filter_service._load_linkage_payload(session, dashboard_id)
    linkage = linkage_item.model_dump(by_alias=True)
    params = build_widget_filter_params(widget_id, linkage, filter_values)
    sql = chart.get("sql") or ""
    injected = inject_sql_parameters(sql, params)
    req = ExecuteRequest(
        dataSourceId=chart.get("dataSourceId"),
        mode="sql",
        sql=injected,
        limit=100,
    )
    return query_service.execute_query(session, actor, req)
