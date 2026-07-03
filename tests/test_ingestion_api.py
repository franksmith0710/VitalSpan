import os
import uuid
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///file:ingestion_test?mode=memory&cache=shared&uri=true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import get_settings
from app.ingestion.models import Base, get_meta_engine
from app.main import app

get_settings.cache_clear()
get_meta_engine.cache_clear()


@pytest.fixture(scope="module", autouse=True)
def ensure_ingestion_tables():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM ingestion_sync_runs"))
        conn.execute(text("DELETE FROM ingestion_etl_rules"))
        conn.execute(text("DELETE FROM ingestion_sync_jobs"))


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def job_payload() -> dict:
    return {
        "name": "sample-mysql-orders",
        "source": {
            "type": "mysql",
            "host": "127.0.0.1",
            "port": 3307,
            "database": "sample_db",
            "username": "sample",
            "password": "sample",
            "table": "dirty_orders",
        },
        "target_table": "orders_clean",
        "schedule_cron": None,
    }


def test_sync_jobs_list_requires_auth(client: TestClient):
    response = client.get("/api/v1/ingestion/sync-jobs")
    assert response.status_code == 401


def test_sync_jobs_crud_roundtrip(client: TestClient, auth_headers: dict, job_payload: dict):
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    assert create.status_code == 201, create.text
    body = create.json()
    job_id = body["id"]
    assert body["name"] == job_payload["name"]
    assert body["source"]["password"] == "***"

    listed = client.get("/api/v1/ingestion/sync-jobs", headers=auth_headers)
    assert listed.status_code == 200
    assert any(item["id"] == job_id for item in listed.json()["items"])

    detail = client.get(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["target_table"] == "orders_clean"

    delete = client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)
    assert delete.status_code == 204


def test_create_job_invalid_source_422(client, auth_headers, job_payload):
    bad = {**job_payload, "source": {**job_payload["source"], "password": ""}}
    response = client.post("/api/v1/ingestion/sync-jobs", json=bad, headers=auth_headers)
    assert response.status_code == 422

    bad_port = {**job_payload, "source": {**job_payload["source"], "port": 0}}
    response2 = client.post("/api/v1/ingestion/sync-jobs", json=bad_port, headers=auth_headers)
    assert response2.status_code == 422


def test_trigger_run_without_analytics_503(client, auth_headers, job_payload):
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    with patch("app.api.v1.ingestion.sync.get_settings") as mock_get:
        mock_get.return_value.analytics_database_url = None
        response = client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/run",
            headers=auth_headers,
        )
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "ANALYTICS_DB_NOT_CONFIGURED"
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_trigger_run_not_found_404(client, auth_headers):
    missing = uuid.uuid4()
    response = client.post(
        f"/api/v1/ingestion/sync-jobs/{missing}/run",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "NOT_FOUND"


def test_list_runs_empty(client, auth_headers, job_payload):
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    listed = client.get(f"/api/v1/ingestion/sync-jobs/{job_id}/runs", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["items"] == []
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_put_etl_rules_roundtrip(client, auth_headers, job_payload):
    rules = [
        {"type": "rename_column", "from": "product_name", "to": "product"},
        {"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"},
    ]
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    put = client.put(
        f"/api/v1/ingestion/sync-jobs/{job_id}/etl-rules",
        json={"rules": rules},
        headers=auth_headers,
    )
    assert put.status_code == 200
    assert put.json()["rules"] == rules
    got = client.get(f"/api/v1/ingestion/sync-jobs/{job_id}/etl-rules", headers=auth_headers)
    assert got.json()["rules"] == rules
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)
