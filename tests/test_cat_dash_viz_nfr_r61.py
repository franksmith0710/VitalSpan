"""跨域远期薄弱项 L1 kickoff r61 — CAT/DASH/VIZ/NFR."""
from __future__ import annotations

import os
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.main import app as fastapi_app

_R61_SQLITE_URL = "sqlite+pysqlite:///file:cat_dash_viz_nfr_r61?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r61_sqlite_env():
    previous_db = os.environ.get("DATABASE_URL")
    previous_nfr08 = os.environ.get("NFR08_RUNTIME_MODE")
    os.environ["DATABASE_URL"] = _R61_SQLITE_URL
    os.environ.setdefault("NFR08_RUNTIME_MODE", "permissive")
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
    import app.governance.catalog.models  # noqa: F401
    import app.query.config_store.models  # noqa: F401
    import app.query.models  # noqa: F401

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    AuthBase.metadata.create_all(engine)
    QueryBase.metadata.create_all(engine)
    yield
    if previous_db is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous_db
    if previous_nfr08 is None:
        os.environ.pop("NFR08_RUNTIME_MODE", None)
    else:
        os.environ["NFR08_RUNTIME_MODE"] = previous_nfr08
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(fastapi_app)


@pytest.fixture
def viewer_user() -> Generator[None, None, None]:
    async def _override() -> UserContext:
        return UserContext(id="viewer-r61", username="viewer", roles=["viewer"])

    fastapi_app.dependency_overrides[get_current_user] = _override
    yield
    fastapi_app.dependency_overrides.pop(get_current_user, None)


def _create_dashboard_with_widget(client: TestClient, widget_id: str = "w-r61-1") -> str:
    create = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json={"name": f"R61-{uuid.uuid4().hex[:6]}", "description": "r61 fixture"},
    )
    assert create.status_code == 201, create.text
    dash_id = create.json()["id"]
    layout = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        headers=AUTH,
        json={
            "layoutJson": {
                "version": 1,
                "widgets": [{"id": widget_id, "type": "chart", "order": 0}],
                "globalFilters": [],
            }
        },
    )
    assert layout.status_code == 200, layout.text
    return dash_id


def _ticket_payload(key: str = "TICKET_OPS") -> dict:
    return {
        "ticketCategoryKey": key,
        "displayName": "Ops Tickets",
        "statusFilters": ["open", "pending"],
        "tableRef": "stub.tickets",
        "allowedRoles": ["analyst"],
    }


from app.query.config_store.schemas import ALLOWED_CONFIG_TYPES


def test_r61_fixture_bootstraps(client):
    """T-R61-000-01: r61 sqlite 环境 health 可达。"""
    resp = client.get("/health")
    assert resp.status_code == 200


def test_r61_config_types_include_global_filter_linkage():
    """T-R61-000-02: config_store 允许 global_filter_linkage。"""
    assert "global_filter_linkage" in ALLOWED_CONFIG_TYPES


def test_cat_r61_005_validate_ok(client):
    """T-CAT-R61-005-01: POST /tickets/validate 合法 200 valid=true。"""
    resp = client.post("/api/v1/gov/catalog/tickets/validate", headers=AUTH, json=_ticket_payload())
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True
    assert body["categoryKey"] == "TICKET_OPS"
    assert body["statusCount"] == 2


def test_cat_r61_005_validate_empty_status_filters(client):
    """T-CAT-R61-005-02: 空 statusFilters 422 CAT05_EMPTY_STATUS_FILTERS。"""
    payload = _ticket_payload()
    payload["statusFilters"] = []
    resp = client.post("/api/v1/gov/catalog/tickets/validate", headers=AUTH, json=payload)
    assert resp.status_code == 422
    assert resp.json()["code"] == "CAT05_EMPTY_STATUS_FILTERS"


def test_cat_r61_005_create_and_list(client):
    """T-CAT-R61-005-03: POST items 201 + GET 列表含该项。"""
    key = f"T_{uuid.uuid4().hex[:6].upper()}"
    payload = _ticket_payload(key)
    create = client.post("/api/v1/gov/catalog/tickets/items", headers=AUTH, json=payload)
    assert create.status_code == 201, create.text
    listed = client.get("/api/v1/gov/catalog/tickets/items", headers=AUTH)
    assert listed.status_code == 200
    keys = [i["ticketCategoryKey"] for i in listed.json()["items"]]
    assert key in keys


def test_cat_r61_005_create_conflict(client):
    """T-CAT-R61-005-04: 重复 key 409 CAT05_KEY_CONFLICT。"""
    key = f"DUP_{uuid.uuid4().hex[:4].upper()}"
    payload = _ticket_payload(key)
    assert client.post("/api/v1/gov/catalog/tickets/items", headers=AUTH, json=payload).status_code == 201
    dup = client.post("/api/v1/gov/catalog/tickets/items", headers=AUTH, json=payload)
    assert dup.status_code == 409
    assert dup.json()["code"] == "CAT05_KEY_CONFLICT"


def test_cat_r61_005_stats_probe(client):
    """T-CAT-R61-005-05: GET stats mock counts 200。"""
    key = f"ST_{uuid.uuid4().hex[:4].upper()}"
    client.post("/api/v1/gov/catalog/tickets/items", headers=AUTH, json=_ticket_payload(key))
    resp = client.get(f"/api/v1/gov/catalog/tickets/items/{key}/stats", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) >= {"open", "closed", "pending", "sampledAt"}
    assert isinstance(body["open"], int)


def test_cat_r61_005_stats_not_found(client):
    """T-CAT-R61-005-06: 未知 key 404 CAT05_NOT_FOUND。"""
    resp = client.get("/api/v1/gov/catalog/tickets/items/MISSING_KEY/stats", headers=AUTH)
    assert resp.status_code == 404
    assert resp.json()["code"] == "CAT05_NOT_FOUND"
