"""M8/M12/M13 integration API companion quality r45 — API-003/004/005/006/007."""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

_R45_SQLITE_URL = "sqlite+pysqlite:///file:integration_r45?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}
SEED_TEMPLATE_ID = "00000000-0000-4000-8000-0000000000a1"
FORCE_FAIL_TEMPLATE_ID = "00000000-0000-4000-8000-00000000f001"


@pytest.fixture(scope="module", autouse=True)
def r45_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R45_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
    import app.governance.catalog.models  # noqa: F401
    import app.query.models  # noqa: F401

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    AuthBase.metadata.create_all(engine)
    QueryBase.metadata.create_all(engine)
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)


def _create_catalog_entry(
    client: TestClient,
    *,
    path: str,
    status: str = "published",
    name: str = "Svc",
) -> str:
    resp = client.post(
        "/api/v1/gov/catalog/entries",
        headers=AUTH,
        json={
            "name": name,
            "httpMethod": "POST",
            "path": path,
            "categoryCodes": ["CAT-01"],
            "status": status,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_r45_fixture_bootstraps(client):
    """T-API-R45-000-01: r45 sqlite 环境可启动 health。"""
    resp = client.get("/health")
    assert resp.status_code == 200
