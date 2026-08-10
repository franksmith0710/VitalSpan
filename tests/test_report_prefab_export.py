"""Prefab binding export — renderSpec to document bytes."""
from __future__ import annotations

import os
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app as fastapi_app
from jwt_auth import AUTH

_SQLITE = "sqlite+pysqlite:///file:rpt_prefab_export?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def _sqlite():
    prev = os.environ.get("DATABASE_URL")
    prev_meta = os.environ.get("RPT_METADATA_STORE")
    os.environ["DATABASE_URL"] = _SQLITE
    os.environ["RPT_METADATA_STORE"] = "memory"
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    import app.auth.models  # noqa: F401
    import app.metadata.dataset.models  # noqa: F401
    import app.reports.persistence.models  # noqa: F401

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    AuthBase.metadata.create_all(engine)
    yield
    os.environ["DATABASE_URL"] = prev if prev else os.environ.pop("DATABASE_URL", None)
    if prev_meta is None:
        os.environ.pop("RPT_METADATA_STORE", None)
    else:
        os.environ["RPT_METADATA_STORE"] = prev_meta
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    fastapi_app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset():
    from app.metadata.dataset import service as dataset_service
    from app.reports.persistence.store import reset_metadata_for_tests

    reset_metadata_for_tests()
    dataset_service._store.clear()
    yield
    reset_metadata_for_tests()
    dataset_service._store.clear()
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(fastapi_app)


def test_prefab_export_returns_pdf(client: TestClient):
    key = "prefab-entity-lifecycle"
    client.put(
        f"/api/v1/reports/prefab/bindings/{key}",
        headers=AUTH,
        json={
            "bindingKey": key,
            "entityTypeCode": "equipment",
            "analysisType": "lifecycle",
            "dimensionCodes": ["status"],
            "displayName": "实体生命周期分布",
            "allowedRoles": ["admin"],
        },
    )
    with patch("app.reports.prefab.export.run_prefab_binding") as mock_run:
        mock_run.return_value = type(
            "RunOut",
            (),
            {
                "render_spec": {
                    "sections": [{
                        "kind": "table",
                        "columns": ["status", "cnt"],
                        "rows": [["active", 3]],
                        "placeholder": False,
                    }],
                },
            },
        )()
        resp = client.get(
            f"/api/v1/reports/prefab/bindings/{key}/export?format=pdf",
            headers=AUTH,
        )
    assert resp.status_code == 200, resp.text
    assert resp.content.startswith(b"%PDF")
    assert "attachment" in resp.headers.get("content-disposition", "")


def test_prefab_delete_binding(client: TestClient):
    key = "prefab-to-delete"
    client.put(
        f"/api/v1/reports/prefab/bindings/{key}",
        headers=AUTH,
        json={
            "bindingKey": key,
            "entityTypeCode": "equipment",
            "analysisType": "lifecycle",
            "dimensionCodes": ["status"],
            "displayName": "待删除",
            "allowedRoles": ["admin"],
        },
    )
    deleted = client.delete(f"/api/v1/reports/prefab/bindings/{key}", headers=AUTH)
    assert deleted.status_code == 204
    missing = client.get(f"/api/v1/reports/prefab/bindings/{key}", headers=AUTH)
    assert missing.status_code == 404
