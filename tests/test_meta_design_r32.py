"""M11 META + M12 查询设计元数据 L1 r32 — META-001/002 + QUERY-007 + DESIGN-001/002."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

_R32_SQLITE_URL = "sqlite+pysqlite:///file:meta_design_r32?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r32_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R32_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
    import app.governance.catalog.models  # noqa: F401
    import app.metadata.glossary.models  # noqa: F401
    import app.metadata.themes.models  # noqa: F401
    import app.query.config_store.models  # noqa: F401
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


def test_r32_fixture_health(client):
    """T-META-R32-000-01: fixture 可用，/health 200。"""
    assert client.get("/health").status_code == 200


def test_meta_term_create_and_list_r32(client):
    """T-META-R32-001-01: POST 合法 term → 201；GET list 含该项。"""
    payload = {"code": "order_amount", "name": "订单金额", "definition": "订单含税金额"}
    created = client.post("/api/v1/metadata/glossary", headers=AUTH, json=payload)
    assert created.status_code == 201
    body = created.json()
    assert body["code"] == "order_amount"
    listed = client.get("/api/v1/metadata/glossary", headers=AUTH)
    assert listed.status_code == 200
    codes = [t["code"] for t in listed.json()["items"]]
    assert "order_amount" in codes


def test_meta_term_duplicate_code_r32(client):
    """T-META-R32-001-02: 重复 code → 409 META_TERM_CODE_CONFLICT。"""
    payload = {"code": "dup_term", "name": "A"}
    assert client.post("/api/v1/metadata/glossary", headers=AUTH, json=payload).status_code == 201
    dup = client.post("/api/v1/metadata/glossary", headers=AUTH, json=payload)
    assert dup.status_code == 409
    assert dup.json()["code"] == "META_TERM_CODE_CONFLICT"


def test_meta_term_invalid_payload_r32(client):
    """T-META-R32-001-03: 缺 name / 非法 code → 422。"""
    bad_code = client.post(
        "/api/v1/metadata/glossary", headers=AUTH, json={"code": "1bad", "name": "X"}
    )
    assert bad_code.status_code == 422
    no_name = client.post("/api/v1/metadata/glossary", headers=AUTH, json={"code": "valid_code"})
    assert no_name.status_code == 422


def test_meta_term_delete_in_use_r32(client):
    """T-META-R32-001-04: DELETE 被 theme 引用 → 409 META_TERM_IN_USE（themes 在 Task 3 实现后完整断言）。"""
    term = client.post(
        "/api/v1/metadata/glossary",
        headers=AUTH,
        json={"code": "linked_term", "name": "关联术语"},
    ).json()
    theme = client.post(
        "/api/v1/metadata/themes",
        headers=AUTH,
        json={"name": "主题", "termId": term["id"]},
    )
    if theme.status_code == 201:
        deleted = client.delete(f"/api/v1/metadata/glossary/{term['id']}", headers=AUTH)
        assert deleted.status_code == 409
        assert deleted.json()["code"] == "META_TERM_IN_USE"
