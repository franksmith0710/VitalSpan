from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.dashboard.schemas import DashboardLayout, DashboardOut


def test_dashboard_out_serializes_camel_case_layout_json() -> None:
    layout = DashboardLayout.model_validate(
        {
            "version": 1,
            "widgets": [],
            "globalFilters": [],
        }
    )
    out = DashboardOut(
        id=uuid.uuid4(),
        name="测试看板",
        slug="test-dash",
        description=None,
        layout_json=layout,
        created_by=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    payload = out.model_dump(mode="json", by_alias=True)
    assert "layoutJson" in payload
    assert "layout_json" not in payload
    assert payload["layoutJson"]["globalFilters"] == []
