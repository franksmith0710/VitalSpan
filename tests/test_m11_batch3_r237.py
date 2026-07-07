"""M11 batch3 r237 — VIZ-005 timeRange + VIZ-007 SDK FE + CAT-04~06 m11-probe."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from jwt_auth import AUTH

_R237_SQLITE_URL = "sqlite+pysqlite:///file:m11_batch3_r237?mode=memory&cache=shared&uri=true"


def _minimal_sql_chart(**extra) -> dict:
    base = {
        "chartType": "table",
        "dataSourceId": str(uuid.uuid4()),
        "mode": "sql",
        "sql": "SELECT * FROM t WHERE d >= :time_start AND d <= :time_end",
        "dimensions": [{"field": "d"}],
        "metrics": [{"field": "cnt"}],
    }
    base.update(extra)
    return base


@pytest.fixture(scope="module", autouse=True)
def r237_sqlite_env():
    import os
    from app.core.config import get_settings

    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R237_SQLITE_URL
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
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()


@pytest.fixture
def client():
    from app.main import app as fastapi_app
    return TestClient(fastapi_app)


def test_viz_r237_005_01_validate_relative_time_range(client: TestClient):
    payload = _minimal_sql_chart(
        timeRange={
            "enabled": True,
            "mode": "relative",
            "relativePreset": "last_7d",
        }
    )
    resp = client.post("/api/v1/charts/validate", headers=AUTH, json=payload)
    assert resp.status_code == 200


def test_viz_r237_005_02_validate_absolute_start_after_end_422(client: TestClient):
    payload = _minimal_sql_chart(
        timeRange={
            "enabled": True,
            "mode": "absolute",
            "start": "2026-07-07",
            "end": "2026-06-01",
        }
    )
    resp = client.post("/api/v1/charts/validate", headers=AUTH, json=payload)
    assert resp.status_code == 422
