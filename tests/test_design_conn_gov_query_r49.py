"""M13 设计器 + M11 OpenSearch + 治理/查询 L1 kickoff r49."""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

_R49_SQLITE_URL = "sqlite+pysqlite:///file:design_conn_gov_query_r49?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r49_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R49_SQLITE_URL
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


def _ref_id() -> str:
    return str(uuid.uuid4())


def _designer_ref_payload(ref_id: str | None = None) -> dict:
    rid = ref_id or _ref_id()
    return {"refType": "design_draft", "refId": rid}


from app.query.config_store.schemas import ALLOWED_CONFIG_TYPES


def test_r49_fixture_bootstraps(client):
    """T-R49-000-01: r49 sqlite 环境 health 可达。"""
    resp = client.get("/health")
    assert resp.status_code == 200


def test_r49_config_types_include_new_kinds():
    """T-R49-000-02: config_store 允许 sql_mode/output_fields/workflow_instance。"""
    assert {"sql_mode", "output_fields", "workflow_instance"}.issubset(ALLOWED_CONFIG_TYPES)
