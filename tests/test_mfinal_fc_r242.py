"""M-FINAL F-C 批次 1 r242 — CONN-017~021 信创连接器 companion。"""
from __future__ import annotations

import json
import os
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from jwt_auth import jwt_auth_headers

from app.core.config import get_settings
from app.datasources.dialects.dm import DmConnector
from app.datasources.registry import export_type_catalog
from app.main import app

AUTH = jwt_auth_headers()
_R242_SQLITE_URL = "sqlite+pysqlite:///file:mfinal_fc_r242?mode=memory&cache=shared&uri=true"

pytestmark = [pytest.mark.integration]


@pytest.fixture(scope="module", autouse=True)
def r242_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R242_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
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
def client() -> TestClient:
    return TestClient(app)


def test_conn_r242_scaffold_imports():
    """Scaffold: module loads."""
    assert app is not None


# --- CONN-017 DM ---


def test_conn_r242_017_01_types_catalog_dm():
    """T-CONN-R242-017-01: export_type_catalog 含 dm，displayName 含达梦，category=relational。"""
    types = {item["type"]: item for item in export_type_catalog()}
    assert "dm" in types
    assert "达梦" in types["dm"]["displayName"]
    assert types["dm"]["category"] == "relational"


def test_conn_r242_017_02_probe_readonly_sql():
    """T-CONN-R242-017-02: mock dmPython cursor → probe_readonly_sql True；execute SELECT 1 FROM DUAL。"""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    assert DmConnector().probe_readonly_sql(conn) is True
    cursor.execute.assert_called_once_with("SELECT 1 FROM DUAL")


@patch("dmPython.connect")
def test_conn_r242_017_03_http_test_no_password(mock_connect, client):
    """T-CONN-R242-017-03: POST /datasources/test type=dm mock 失败 → 响应无 password。"""
    mock_connect.side_effect = Exception("Login failed secret_token_xyz")
    resp = client.post(
        "/api/v1/datasources/test",
        headers=AUTH,
        json={
            "type": "dm",
            "name": "dm-r242",
            "code": f"dm-{uuid.uuid4().hex[:8]}",
            "host": "127.0.0.1",
            "port": 5236,
            "database": "DAMENG",
            "username": "u",
            "password": "secret_token_xyz",
        },
    )
    assert resp.status_code == 200
    assert "secret_token_xyz" not in json.dumps(resp.json())
    assert "password" not in resp.text.lower()


def test_conn_r242_017_04_readonly_guard_dm(client):
    """T-CONN-R242-017-04: readonly-guard connectorType=dm sql=SELECT 1 → 200 ok mode=sql。"""
    resp = client.post(
        "/api/v1/query/readonly-guard",
        headers=AUTH,
        json={"connectorType": "dm", "sql": "SELECT 1"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["mode"] == "sql"
