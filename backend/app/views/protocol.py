from __future__ import annotations

from typing import Any

from app.views.validate import validate_dashboard_view

VIEW_PROTOCOL_VERSION = 1


def round_trip_view_document(data: dict[str, Any]) -> dict[str, Any]:
    view = validate_dashboard_view(data)
    dumped = view.model_dump(by_alias=True, mode="json")
    validate_dashboard_view(dumped)
    return dumped


def export_view_json_schema() -> dict[str, Any]:
    from app.views.schemas import DashboardView

    return DashboardView.model_json_schema()
