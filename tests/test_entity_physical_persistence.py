"""Persistence tests for entity/physical, gov config, embed tokens (0039)."""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.main import app as fastapi_app
from jwt_auth import AUTH

_PERSIST_SQLITE = "sqlite+pysqlite:///file:entity_physical_persist?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def persist_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _PERSIST_SQLITE
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
    import app.governance.persistence.models  # noqa: F401
    import app.integration.models  # noqa: F401
    import app.metadata.entity.models  # noqa: F401
    import app.metadata.physical.models  # noqa: F401
    import app.query.config_store.models  # noqa: F401
    import app.query.models  # noqa: F401
    import app.views.models  # noqa: F401

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
def client() -> TestClient:
    return TestClient(fastapi_app)


@pytest.fixture(autouse=True)
def clear_stores():
    from app.metadata.entity import service as entity_service
    from app.metadata.physical import service as physical_service
    from app.governance.catalog.cat01 import service as cat01_service
    from app.integration import embed_token_repo
    from app.datasources.models import get_meta_session

    entity_service._store.clear()
    physical_service._store.clear()
    cat01_service._store.clear()
    session = get_meta_session()
    try:
        embed_token_repo.clear_all(session)
    finally:
        session.close()
    yield
    entity_service._store.clear()
    physical_service._store.clear()
    cat01_service._store.clear()
    session = get_meta_session()
    try:
        embed_token_repo.clear_all(session)
    finally:
        session.close()


def test_entity_type_survives_new_session(client: TestClient):
    from app.auth.models import get_meta_engine
    from app.metadata.entity import entity_repo

    created = client.post(
        "/api/v1/metadata/entity-types",
        headers=AUTH,
        json={
            "typeCode": "order_persist",
            "displayName": "订单",
            "attributes": [{"name": "order_id", "dataType": "string", "required": True}],
        },
    )
    assert created.status_code == 201, created.text

    with Session(get_meta_engine()) as db:
        row = entity_repo.get(db, "order_persist")
    assert row is not None
    assert row["displayName"] == "订单"

    listed = client.get("/api/v1/metadata/entity-types", headers=AUTH)
    assert listed.status_code == 200
    codes = [i["typeCode"] for i in listed.json()["items"]]
    assert "order_persist" in codes


def test_physical_table_survives_new_session(client: TestClient):
    from app.auth.models import get_meta_engine
    from app.metadata.physical import physical_repo

    ds_id = str(uuid.uuid4())
    created = client.post(
        "/api/v1/metadata/physical-tables",
        headers=AUTH,
        json={
            "tableFqn": "sales.orders_persist",
            "dataSourceId": ds_id,
            "displayName": "Orders",
            "columns": [{"name": "id", "dataType": "bigint", "nullable": False}],
        },
    )
    assert created.status_code == 201, created.text

    with Session(get_meta_engine()) as db:
        row = physical_repo.get(db, "sales.orders_persist")
    assert row is not None
    assert row["displayName"] == "Orders"


def test_cat01_template_persists(client: TestClient):
    from app.auth.models import get_meta_engine
    from app.governance.catalog import gov_config_store

    key = f"TPL_PERSIST_{uuid.uuid4().hex[:4].upper()}"
    created = client.post(
        "/api/v1/gov/catalog/lifecycle-templates",
        headers=AUTH,
        json={
            "templateKey": key,
            "displayName": "Persist",
            "entityTypeCode": "ticket",
            "lifecycleStages": ["open", "closed"],
            "readOnlyOpenApi": False,
            "allowedRoles": ["analyst"],
        },
    )
    assert created.status_code == 201, created.text

    with Session(get_meta_engine()) as db:
        row = gov_config_store.get_json(
            db,
            config_type="gov_lifecycle_template",
            ref_type="lifecycle_template",
            key=key,
        )
    assert row is not None
    assert row["templateKey"] == key


def test_embed_token_persists(client: TestClient):
    from app.datasources.models import get_meta_session
    from app.integration import embed_token_repo

    chart_id = str(uuid.uuid4())
    issued = client.post(
        "/api/v1/embed/token",
        headers=AUTH,
        json={"chartId": chart_id, "expiresInSec": 3600},
    )
    assert issued.status_code == 201, issued.text
    token = issued.json()["token"]

    session = get_meta_session()
    try:
        assert embed_token_repo.get_token(session, token) is not None
    finally:
        session.close()

    sdk = client.get(f"/api/v1/embed/sdk-params?token={token}")
    assert sdk.status_code == 200
