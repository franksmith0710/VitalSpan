"""跨域 NFR/CAT 远期 stub L1 + CAT-007 companion r64."""
from __future__ import annotations

import os
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.main import app as fastapi_app

_R64_SQLITE_URL = "sqlite+pysqlite:///file:nfr_cat_r64?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r64_sqlite_env():
    previous_db = os.environ.get("DATABASE_URL")
    previous_nfr08 = os.environ.get("NFR08_RUNTIME_MODE")
    previous_dfs = os.environ.get("DASHBOARD_FIRST_SCREEN_MODE")
    previous_ham = os.environ.get("HTTPS_AUDIT_MODE")
    os.environ["DATABASE_URL"] = _R64_SQLITE_URL
    os.environ.setdefault("NFR08_RUNTIME_MODE", "permissive")
    os.environ.pop("DASHBOARD_FIRST_SCREEN_MODE", None)
    os.environ.pop("HTTPS_AUDIT_MODE", None)
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
    if previous_dfs is None:
        os.environ.pop("DASHBOARD_FIRST_SCREEN_MODE", None)
    else:
        os.environ["DASHBOARD_FIRST_SCREEN_MODE"] = previous_dfs
    if previous_ham is None:
        os.environ.pop("HTTPS_AUDIT_MODE", None)
    else:
        os.environ["HTTPS_AUDIT_MODE"] = previous_ham
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
        return UserContext(id="viewer-r64", username="viewer", roles=["viewer"])

    fastapi_app.dependency_overrides[get_current_user] = _override
    yield
    fastapi_app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def enterprise_user() -> Generator[None, None, None]:
    from app.governance.catalog.cat07 import service as cat07_service

    async def _override() -> UserContext:
        return UserContext(id="enterprise-r64", username="enterprise", roles=["enterprise"])

    cat07_service.set_user_workno_scope("enterprise-r64", "EMP1001")
    fastapi_app.dependency_overrides[get_current_user] = _override
    yield
    fastapi_app.dependency_overrides.pop(get_current_user, None)


def _lifecycle_payload(key: str = "LIFE_OPS") -> dict:
    return {
        "templateKey": key,
        "displayName": "Ops Lifecycle",
        "entityTypeCode": "ticket",
        "lifecycleStages": ["created", "active", "closed"],
        "readOnlyOpenApi": True,
        "allowedRoles": ["analyst"],
    }


def _aggregate_payload(key: str = "AGG_SALES") -> dict:
    return {
        "aggregateKey": key,
        "displayName": "Sales Aggregate",
        "dimensions": ["region"],
        "metrics": ["amount"],
        "aggregationFn": "sum",
        "attributionLabel": "poc-sales-v1",
        "tableRef": "stub.sales",
    }


def test_r64_fixture_bootstraps(client):
    """Bootstrap: health + auth smoke."""
    resp = client.get("/health")
    assert resp.status_code == 200
    me = client.get("/api/v1/me", headers=AUTH)
    assert me.status_code == 200
