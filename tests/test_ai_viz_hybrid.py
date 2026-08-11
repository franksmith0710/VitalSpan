"""VS-AI hybrid viz: artifacts API, customViz layout, manual dataBinding."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.chart_view import validate_chart_view_config
from app.views.validate import validate_layout_dict

client = TestClient(app)

DEMO_BUNDLE = {
    "manifest": {
        "id": "demo-ranking-strip",
        "displayName": "演示排名条",
        "entry": "index.html",
    },
    "files": {
        "index.html": "<!DOCTYPE html><html><body><p>ok</p></body></html>",
    },
}


def test_validate_chart_manual_data_binding() -> None:
    cfg = validate_chart_view_config(
        {
            "chartType": "bar",
            "styleVariant": "default",
            "nativeBody": {"dataBinding": {"status": "manual"}},
        }
    )
    assert cfg.chart_type == "bar"
    assert cfg.data_source_id is None


def test_validate_layout_custom_viz_widget() -> None:
    artifact_id = str(uuid.uuid4())
    layout = validate_layout_dict(
        {
            "version": 2,
            "canvas": {"width": 1440, "height": 1080},
            "widgets": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "customViz",
                    "title": "AI Widget",
                    "x": 0,
                    "y": 0,
                    "width": 400,
                    "height": 300,
                    "order": 0,
                    "customVizConfig": {
                        "artifactId": artifact_id,
                        "dataBinding": {"status": "manual"},
                    },
                }
            ],
            "globalFilters": [],
        }
    )
    assert layout["widgets"][0]["type"] == "customViz"
    assert layout["widgets"][0]["customVizConfig"]["artifactId"] == artifact_id


def test_ai_viz_artifact_create_and_entry(auth_headers: dict[str, str]) -> None:
    resp = client.post("/api/v1/ai-viz/artifacts", json=DEMO_BUNDLE, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    artifact_id = resp.json()["artifactId"]
    meta = client.get(f"/api/v1/ai-viz/artifacts/{artifact_id}", headers=auth_headers)
    assert meta.status_code == 200
    entry = client.get(f"/api/v1/ai-viz/artifacts/{artifact_id}/entry", headers=auth_headers)
    assert entry.status_code == 200
    assert "ok" in entry.text


def test_ai_viz_rejects_external_script(auth_headers: dict[str, str]) -> None:
    bad = {
        **DEMO_BUNDLE,
        "files": {"index.html": '<script src="https://evil.example/x.js"></script>'},
    }
    resp = client.post("/api/v1/ai-viz/artifacts", json=bad, headers=auth_headers)
    assert resp.status_code == 422
    assert resp.json()["code"] == "AIVIZ_UNSAFE_CONTENT"
