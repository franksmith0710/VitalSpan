"""M11 嵌入式/时序/文档连接器 companion 质量推分 r41 — CONN-014/011/012/006/013."""
from __future__ import annotations

import os
import uuid
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.datasources.dialects.mongodb import MongodbConnector
from app.datasources.models import get_meta_session
from app.datasources.schemas import DataSourceCreate
from app.datasources.service import create_data_source
from app.main import app

_R41_SQLITE_URL = "sqlite+pysqlite:///file:connectors_gov_r41?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r41_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R41_SQLITE_URL
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


def _create_typed_ds(ds_type: str, *, host: str | None = None, name_suffix: str | None = None):
    suffix = name_suffix or uuid.uuid4().hex[:8]
    session = get_meta_session()
    try:
        defaults = {
            "mongodb": dict(port=27017, database="app", username="x", password="x"),
            "influxdb": dict(port=8086, database="metrics", username="myorg", password="token"),
            "tdengine": dict(port=6041, database="power", username="root", password="taosdata"),
            "sqlite": dict(port=1, database="main", username="sqlite", password="x"),
            "timescaledb": dict(port=5432, database="metrics", username="ts", password="secret"),
        }
        extra = defaults.get(ds_type, {})
        return create_data_source(
            session,
            DataSourceCreate(
                name=f"{ds_type}-{suffix}",
                code=f"{ds_type}-{suffix}",
                type=ds_type,
                host=host or "127.0.0.1",
                port=extra.get("port", 5432),
                database=extra.get("database", "test"),
                username=extra.get("username", "user"),
                password=extra.get("password", "secret"),
            ),
        )
    finally:
        session.close()


def test_r41_scaffold():
    """占位：fixture 可加载。"""
    assert app is not None


@patch("app.datasources.dialects.mongodb._get_client")
def test_mongodb_unknown_database_r41(mock_get_client):
    """T-CONN-R41-014-01: mock database missing → MONGODB_UNKNOWN_DATABASE。"""
    from pymongo.errors import OperationFailure

    mock_get_client.side_effect = OperationFailure('database "missing" does not exist', code=26)
    result = MongodbConnector().test_connection(
        host="127.0.0.1", port=27017, database="missing", username="", password=""
    )
    assert result.ok is False
    assert result.code == "MONGODB_UNKNOWN_DATABASE"


from app.datasources.registry import export_type_catalog


@patch("app.datasources.dialects.mongodb._get_client")
def test_mongodb_empty_collection_columns_r41(mock_get_client):
    """T-CONN-R41-014-02: mock 空 collection list_columns → []。"""
    client = MagicMock()
    collection = MagicMock()
    collection.find_one.return_value = None
    db = MagicMock()
    db.__getitem__.return_value = collection
    client.__getitem__.return_value = db
    mock_get_client.return_value = client
    connector = MongodbConnector()
    connection = connector.open_connection(
        host="127.0.0.1", port=27017, database="app", username="", password=""
    )
    assert connector.list_columns(connection, "app", "events") == []


@patch("app.datasources.dialects.mongodb._get_client")
def test_mongodb_empty_database_tables_r41(mock_get_client):
    """T-CONN-R41-014-03: mock 空库 list_tables → []。"""
    client = MagicMock()
    db = MagicMock()
    db.list_collection_names.return_value = []
    client.__getitem__.return_value = db
    mock_get_client.return_value = client
    connector = MongodbConnector()
    connection = connector.open_connection(
        host="127.0.0.1", port=27017, database="app", username="", password=""
    )
    assert connector.list_tables(connection, "app") == []


@patch("app.datasources.dialects.mongodb._get_client")
def test_mongodb_bson_type_enum_r41(mock_get_client):
    """T-CONN-R41-014-04: mock BSON 六类型 data_type 枚举。"""
    from datetime import datetime

    client = MagicMock()
    collection = MagicMock()
    collection.find_one.return_value = {
        "s": "x",
        "n": 1,
        "b": True,
        "dt": datetime(2026, 1, 1),
        "j": {"a": 1},
        "arr": [1, 2],
    }
    db = MagicMock()
    db.__getitem__.return_value = collection
    client.__getitem__.return_value = db
    mock_get_client.return_value = client
    connector = MongodbConnector()
    connection = connector.open_connection(
        host="127.0.0.1", port=27017, database="app", username="", password=""
    )
    types = {c.name: c.data_type for c in connector.list_columns(connection, "app", "events")}
    assert types["s"] == "string"
    assert types["n"] == "number"
    assert types["b"] == "boolean"
    assert types["dt"] == "datetime"
    assert types["j"] == "json"
    assert types["arr"] == "json"


def test_mongodb_types_catalog_r41():
    """T-CONN-R41-014-05: types catalog mongodb category=document + schema_browser + displayName。"""
    types = {item["type"]: item for item in export_type_catalog()}
    assert types["mongodb"]["category"] == "document"
    assert "schema_browser" in types["mongodb"]["capabilities"]
    assert types["mongodb"]["displayName"] == "MongoDB"


@patch("app.datasources.dialects.mongodb._get_client")
def test_mongodb_http_auth_failed_r41(mock_get_client, client):
    """T-CONN-R41-014-06: HTTP POST test mock auth fail → 200 ok=false MONGODB_AUTH_FAILED traceId。"""
    from pymongo.errors import OperationFailure

    mock_get_client.side_effect = OperationFailure("Authentication failed", code=18)
    resp = client.post(
        "/api/v1/datasources/test",
        headers=AUTH,
        json={
            "type": "mongodb",
            "name": "mongo-test",
            "code": f"mongo-{uuid.uuid4().hex[:8]}",
            "host": "127.0.0.1",
            "port": 27017,
            "database": "app",
            "username": "bad",
            "password": "bad",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is False
    assert body["code"] == "MONGODB_AUTH_FAILED"
    assert body.get("traceId")


def test_mongodb_metadata_tables_missing_schema_400_r41(client):
    """T-CONN-R41-014-07: HTTP GET tables 无 schema → 400 METADATA_INVALID_REQUEST。"""
    ds = _create_typed_ds("mongodb")
    resp = client.get(f"/api/v1/datasources/{ds.id}/tables", headers=AUTH)
    assert resp.status_code == 400
    assert resp.json()["code"] == "METADATA_INVALID_REQUEST"
