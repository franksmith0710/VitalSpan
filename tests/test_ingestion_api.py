import os
import uuid
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///file:ingestion_test?mode=memory&cache=shared&uri=true"
os.environ.setdefault(
    "ANALYTICS_DATABASE_URL",
    "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics",
)

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


from datetime import datetime, timezone

from app.ingestion.models import SyncRun, get_meta_session


def test_update_sync_job_put_roundtrip(client, auth_headers, job_payload):
    """T-D01-09: PUT 更新 name/target_table → GET 一致。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    updated = {
        **job_payload,
        "name": "renamed-job",
        "target_table": "orders_renamed",
    }
    put = client.put(
        f"/api/v1/ingestion/sync-jobs/{job_id}",
        json=updated,
        headers=auth_headers,
    )
    assert put.status_code == 200
    assert put.json()["name"] == "renamed-job"
    assert put.json()["target_table"] == "orders_renamed"
    got = client.get(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)
    assert got.json()["name"] == "renamed-job"
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_create_job_invalid_source_type_422(client, auth_headers, job_payload):
    """T-D01-10: source.type oracle → 422。"""
    bad = {**job_payload, "source": {**job_payload["source"], "type": "oracle"}}
    response = client.post("/api/v1/ingestion/sync-jobs", json=bad, headers=auth_headers)
    assert response.status_code == 422


def test_trigger_run_conflict_when_running_exists_409(client, auth_headers, job_payload):
    """T-D01-11: 已有 running run → POST run 409。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = uuid.UUID(create.json()["id"])
    db = get_meta_session()
    db.add(
        SyncRun(
            job_id=job_id,
            status="running",
            trace_id="seed-running",
            started_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.close()
    with patch("app.api.v1.ingestion.sync.get_settings") as mock_get:
        mock_get.return_value.analytics_database_url = "postgresql+psycopg://u:p@localhost:5433/a"
        response = client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/run",
            headers=auth_headers,
        )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "RUN_ALREADY_IN_PROGRESS"
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_openapi_lists_ingestion_sync_job_routes(client):
    """T-D01-12: OpenAPI paths 含 sync-jobs CRUD、run、runs、etl-rules。"""
    paths = client.get("/openapi.json").json()["paths"]
    for fragment in (
        "/ingestion/sync-jobs",
        "/ingestion/sync-jobs/{job_id}/run",
        "/ingestion/sync-jobs/{job_id}/runs",
        "/ingestion/sync-jobs/{job_id}/etl-rules",
    ):
        assert any(fragment in p for p in paths), fragment


@patch("app.api.v1.ingestion.sync.run_job")
def test_trigger_run_manual_accepted_202(mock_run_job, client, auth_headers, job_payload):
    """T-D01-13: 手动 run 202 + run_id。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    with patch("app.api.v1.ingestion.sync.get_settings") as mock_get:
        mock_get.return_value.analytics_database_url = "postgresql+psycopg://u:p@localhost:5433/a"
        response = client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/run",
            headers=auth_headers,
        )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "running"
    assert "run_id" in body
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


import time


def test_get_and_delete_job_not_found_404(client, auth_headers):
    """T-D01-14: GET/DELETE 不存在 job → 404 NOT_FOUND。"""
    missing = uuid.uuid4()
    get_resp = client.get(f"/api/v1/ingestion/sync-jobs/{missing}", headers=auth_headers)
    assert get_resp.status_code == 404
    assert get_resp.json()["detail"]["code"] == "NOT_FOUND"

    del_resp = client.delete(f"/api/v1/ingestion/sync-jobs/{missing}", headers=auth_headers)
    assert del_resp.status_code == 404
    assert del_resp.json()["detail"]["code"] == "NOT_FOUND"


def test_list_runs_respects_limit_param(client, auth_headers, job_payload):
    """T-D01-15: GET .../runs?limit=5 尊重 limit。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = uuid.UUID(create.json()["id"])
    db = get_meta_session()
    for i in range(6):
        db.add(
            SyncRun(
                job_id=job_id,
                status="succeeded",
                trace_id=f"seed-run-{i}",
                started_at=datetime.now(timezone.utc),
                finished_at=datetime.now(timezone.utc),
                rows_synced=i,
            )
        )
    db.commit()
    db.close()

    listed = client.get(
        f"/api/v1/ingestion/sync-jobs/{job_id}/runs?limit=5",
        headers=auth_headers,
    )
    assert listed.status_code == 200
    assert len(listed.json()["items"]) <= 5

    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


@patch("app.api.v1.ingestion.sync.run_job")
def test_trigger_run_consecutive_post_second_409(mock_run_job, client, auth_headers, job_payload):
    """T-D01-16: 连续两次 POST run → 第二次 409（run_job mock 保持 running）。"""
    mock_run_job.return_value = None
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    with patch("app.api.v1.ingestion.sync.get_settings") as mock_get:
        mock_get.return_value.analytics_database_url = "postgresql+psycopg://u:p@localhost:5433/a"
        first = client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/run",
            headers=auth_headers,
        )
        assert first.status_code == 202
        second = client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/run",
            headers=auth_headers,
        )
    assert second.status_code == 409
    assert second.json()["detail"]["code"] == "RUN_ALREADY_IN_PROGRESS"
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_openapi_ingestion_tag_on_post_run(client):
    """T-D01-17: OpenAPI POST run operation 含 ingestion tag。"""
    spec = client.get("/openapi.json").json()
    run_path = next(
        p for p in spec["paths"] if p.endswith("/sync-jobs/{job_id}/run")
    )
    post_op = spec["paths"][run_path]["post"]
    assert "ingestion" in post_op.get("tags", [])


@patch("app.api.v1.ingestion.sync.run_job")
def test_trigger_run_accepts_within_one_second(mock_run_job, client, auth_headers, job_payload):
    """T-D01-18: 手动 run 接受响应耗时 <1.0s。"""
    mock_run_job.return_value = None
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    with patch("app.api.v1.ingestion.sync.get_settings") as mock_get:
        mock_get.return_value.analytics_database_url = "postgresql+psycopg://u:p@localhost:5433/a"
        start = time.perf_counter()
        response = client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/run",
            headers=auth_headers,
        )
        elapsed = time.perf_counter() - start
    assert response.status_code == 202
    assert elapsed < 1.0
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


INGESTION_OPENAPI_PATHS = {
    "/api/v1/ingestion/sync-jobs": {"get", "post"},
    "/api/v1/ingestion/sync-jobs/{job_id}": {"get", "put", "delete"},
    "/api/v1/ingestion/sync-jobs/{job_id}/run": {"post"},
    "/api/v1/ingestion/sync-jobs/{job_id}/runs": {"get"},
    "/api/v1/ingestion/sync-jobs/{job_id}/etl-rules": {"get", "put"},
}


def test_openapi_ingestion_contract_snapshot(client):
    """T-D01-19: ingestion 5 path 的 method/tags 与 SyncJobCreate/SourceConnectionIn 必填字段。"""
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]
    for path, methods in INGESTION_OPENAPI_PATHS.items():
        assert path in paths, path
        for method in methods:
            op = paths[path][method]
            assert "ingestion" in op.get("tags", []), f"{method} {path}"
    components = spec["components"]["schemas"]
    create_required = set(components["SyncJobCreate"]["required"])
    assert {"name", "source", "target_table"}.issubset(create_required)
    src_required = set(components["SourceConnectionIn"]["required"])
    assert {"type", "host", "port", "database", "username", "password", "table"}.issubset(
        src_required
    )


def test_create_job_invalid_source_missing_host_422(client, auth_headers, job_payload):
    """T-D01-20: SourceConnection 缺 host → 422 validation。"""
    source = {k: v for k, v in job_payload["source"].items() if k != "host"}
    bad = {**job_payload, "source": source}
    response = client.post("/api/v1/ingestion/sync-jobs", json=bad, headers=auth_headers)
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, list)


def test_create_job_invalid_source_empty_table_422(client, auth_headers, job_payload):
    """T-D01-20: SourceConnection 缺 table 字段 → 422 validation。"""
    source = {k: v for k, v in job_payload["source"].items() if k != "table"}
    bad = {**job_payload, "source": source}
    response = client.post("/api/v1/ingestion/sync-jobs", json=bad, headers=auth_headers)
    assert response.status_code == 422


def test_put_etl_rules_idempotent(client, auth_headers, job_payload):
    """T-D01-21: 同一 rules 连续 PUT 两次 → 均 200 且 GET 一致。"""
    rules = [
        {"type": "rename_column", "from": "product_name", "to": "product"},
        {"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"},
    ]
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    for _ in range(2):
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


@patch("app.api.v1.ingestion.sync.run_job")
def test_trigger_run_p95_under_half_second(mock_run_job, client, auth_headers, job_payload):
    """T-D01-22: 每次新建 job 后 POST run，10 次采样 P95 <0.5s。"""
    mock_run_job.return_value = None
    durations: list[float] = []
    job_ids: list[str] = []
    with patch("app.api.v1.ingestion.sync.get_settings") as mock_get:
        mock_get.return_value.analytics_database_url = "postgresql+psycopg://u:p@localhost:5433/a"
        for _ in range(10):
            create = client.post(
                "/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers
            )
            assert create.status_code == 201
            job_id = create.json()["id"]
            job_ids.append(job_id)
            start = time.perf_counter()
            response = client.post(
                f"/api/v1/ingestion/sync-jobs/{job_id}/run",
                headers=auth_headers,
            )
            durations.append(time.perf_counter() - start)
            assert response.status_code == 202
    durations_sorted = sorted(durations)
    p95_index = max(0, int(len(durations_sorted) * 0.95) - 1)
    assert durations_sorted[p95_index] < 0.5
    for job_id in job_ids:
        client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_put_etl_rules_non_list_body_422(client, auth_headers, job_payload):
    """T-ETL-14: PUT etl-rules body rules 非 list → 422。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    response = client.put(
        f"/api/v1/ingestion/sync-jobs/{job_id}/etl-rules",
        json={"rules": "not-list"},
        headers=auth_headers,
    )
    assert response.status_code == 422
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_put_etl_rules_object_body_422_chinese_message(client, auth_headers, job_payload):
    """T-ETL-19: PUT etl-rules body rules 为 object 非 list → 422 + message 含规则/列表。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = create.json()["id"]
    response = client.put(
        f"/api/v1/ingestion/sync-jobs/{job_id}/etl-rules",
        json={"rules": {"type": "rename_column"}},
        headers=auth_headers,
    )
    assert response.status_code == 422
    body = response.json()
    raw = body.get("message") or body.get("detail") or body
    message = (
        " ".join(str(item.get("msg", item)) for item in raw)
        if isinstance(raw, list)
        else str(raw)
    )
    assert "规则" in message or "列表" in message
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_trigger_run_triple_post_all_409_when_running_seeded(client, auth_headers, job_payload):
    """T-D02-23: seed running run 后连续 3 次 POST → 均 409 RUN_ALREADY_IN_PROGRESS。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    job_id = uuid.UUID(create.json()["id"])
    db = get_meta_session()
    db.add(
        SyncRun(
            job_id=job_id,
            status="running",
            trace_id="seed-triple-409",
            started_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.close()
    with patch("app.api.v1.ingestion.sync.get_settings") as mock_get:
        mock_get.return_value.analytics_database_url = "postgresql+psycopg://u:p@localhost:5433/a"
        for _ in range(3):
            response = client.post(
                f"/api/v1/ingestion/sync-jobs/{job_id}/run",
                headers=auth_headers,
            )
            assert response.status_code == 409
            assert response.json()["detail"]["code"] == "RUN_ALREADY_IN_PROGRESS"
    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


from app.ingestion.models import SyncJob, decrypt_password


def test_put_empty_password_preserves_cipher_masks_response(client, auth_headers, job_payload):
    """T-D01-23: PUT password='' 保留 DB 密文；GET detail password=='***'。"""
    create = client.post("/api/v1/ingestion/sync-jobs", json=job_payload, headers=auth_headers)
    assert create.status_code == 201
    job_id = create.json()["id"]
    assert create.json()["source"]["password"] == "***"

    db = get_meta_session()
    job = db.get(SyncJob, uuid.UUID(job_id))
    original_cipher = job.source_password_encrypted
    db.close()

    updated = {
        **job_payload,
        "name": "renamed-empty-pw",
        "source": {**job_payload["source"], "password": ""},
    }
    put = client.put(
        f"/api/v1/ingestion/sync-jobs/{job_id}",
        json=updated,
        headers=auth_headers,
    )
    assert put.status_code == 200

    detail = client.get(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)
    assert detail.json()["source"]["password"] == "***"

    db = get_meta_session()
    job_after = db.get(SyncJob, uuid.UUID(job_id))
    assert job_after.source_password_encrypted == original_cipher
    assert decrypt_password(job_after.source_password_encrypted) == job_payload["source"]["password"]
    db.close()

    client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_create_five_jobs_p95_under_800ms(client, auth_headers, job_payload):
    """T-D01-24: 5 次 create 不同 name P95 <0.8s；各 201。"""
    durations: list[float] = []
    job_ids: list[str] = []
    for i in range(5):
        payload = {**job_payload, "name": f"perf-create-{i}"}
        start = time.perf_counter()
        response = client.post("/api/v1/ingestion/sync-jobs", json=payload, headers=auth_headers)
        durations.append(time.perf_counter() - start)
        assert response.status_code == 201
        job_ids.append(response.json()["id"])
    durations_sorted = sorted(durations)
    p95_index = max(0, int(len(durations_sorted) * 0.95) - 1)
    assert durations_sorted[p95_index] < 0.8
    for job_id in job_ids:
        client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


def test_openapi_sync_run_item_required_fields(client):
    """T-D01-25: SyncRunItem.required 含 id,status,started_at,trace_id；paths 含 runs GET。"""
    spec = client.get("/openapi.json").json()
    required = set(spec["components"]["schemas"]["SyncRunItem"]["required"])
    assert {"id", "status", "started_at", "trace_id"}.issubset(required)
    runs_path = next(
        p for p in spec["paths"] if p.endswith("/sync-jobs/{job_id}/runs")
    )
    assert "get" in spec["paths"][runs_path]
