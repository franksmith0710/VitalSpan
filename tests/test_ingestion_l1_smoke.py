import os
import time
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///file:l1_smoke?mode=memory&cache=shared&uri=true"

from app.core.config import get_settings
from app.ingestion.models import Base, get_meta_engine
from app.main import app

get_settings.cache_clear()
get_meta_engine.cache_clear()

L1_RULES = [
    {"type": "rename_column", "from": "product_name", "to": "product"},
    {"type": "cast_type", "column": "amount", "to": "float"},
    {"type": "fill_null", "column": "note", "value": "无备注"},
    {"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"},
]

MOCK_ROWS = [
    {"product_name": "Widget A", "amount": "12.5", "status": "active", "note": None},
    {"product_name": "Widget B", "amount": "2", "status": "active", "note": None},
]


@pytest.fixture(scope="module", autouse=True)
def meta_tables():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def smoke_client(monkeypatch) -> TestClient:
    monkeypatch.setenv(
        "ANALYTICS_DATABASE_URL",
        "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics",
    )
    get_settings.cache_clear()
    return TestClient(app)


@patch("app.ingestion.sync_executor._write_analytics", return_value=2)
@patch("app.ingestion.sync_executor._fetch_mysql_rows", return_value=MOCK_ROWS)
def test_l1_mock_smoke_success(mock_fetch, mock_write, smoke_client, auth_headers):
    """T-D05-01 / T-D02-07: mock L1 创建→规则→run→succeeded + traceId/行数。"""
    payload = {
        "name": "l1-mock-smoke",
        "source": {
            "type": "mysql",
            "host": "127.0.0.1",
            "port": 3307,
            "database": "sample_db",
            "username": "sample",
            "password": "sample",
            "table": "dirty_orders",
        },
        "target_table": "orders_mock_l1",
        "schedule_cron": None,
    }
    create = smoke_client.post("/api/v1/ingestion/sync-jobs", json=payload, headers=auth_headers)
    assert create.status_code == 201, create.text
    job_id = create.json()["id"]

    put_rules = smoke_client.put(
        f"/api/v1/ingestion/sync-jobs/{job_id}/etl-rules",
        json={"rules": L1_RULES},
        headers=auth_headers,
    )
    assert put_rules.status_code == 200

    trace_headers = {**auth_headers, "X-Trace-Id": "mock-l1-trace-001"}
    run = smoke_client.post(
        f"/api/v1/ingestion/sync-jobs/{job_id}/run",
        headers=trace_headers,
    )
    assert run.status_code == 202
    run_id = run.json()["run_id"]

    deadline = time.time() + 10
    final = None
    while time.time() < deadline:
        listed = smoke_client.get(
            f"/api/v1/ingestion/sync-jobs/{job_id}/runs",
            headers=auth_headers,
        )
        items = listed.json()["items"]
        match = next((i for i in items if i["id"] == run_id), None)
        if match and match["status"] in ("succeeded", "failed"):
            final = match
            break
        time.sleep(0.1)

    assert final is not None
    assert final["status"] == "succeeded", final
    assert final["trace_id"] == "mock-l1-trace-001"
    assert final["rows_synced"] == 2
    assert final["error_message"] is None
    mock_fetch.assert_called()
    mock_write.assert_called()
    written_rows = mock_write.call_args[0][1]
    assert len(written_rows) == len(MOCK_ROWS)

    smoke_client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


@patch("app.ingestion.sync_executor._write_analytics", return_value=1)
@patch("app.ingestion.sync_executor._fetch_mysql_rows", return_value=MOCK_ROWS[:1])
def test_l1_mock_smoke_history_list_order(mock_fetch, mock_write, smoke_client, auth_headers):
    """T-D05-03: runs 按 started_at 降序。"""
    payload = {
        "name": "l1-order-smoke",
        "source": {
            "type": "mysql",
            "host": "127.0.0.1",
            "port": 3307,
            "database": "sample_db",
            "username": "sample",
            "password": "sample",
            "table": "dirty_orders",
        },
        "target_table": "orders_order_test",
        "schedule_cron": None,
    }
    create = smoke_client.post("/api/v1/ingestion/sync-jobs", json=payload, headers=auth_headers)
    job_id = create.json()["id"]
    for _ in range(2):
        run_resp = smoke_client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/run",
            headers=auth_headers,
        )
        if run_resp.status_code == 409:
            time.sleep(0.2)
            run_resp = smoke_client.post(
                f"/api/v1/ingestion/sync-jobs/{job_id}/run",
                headers=auth_headers,
            )
        assert run_resp.status_code == 202
        deadline = time.time() + 15
        while time.time() < deadline:
            listed = smoke_client.get(
                f"/api/v1/ingestion/sync-jobs/{job_id}/runs",
                headers=auth_headers,
            )
            items = listed.json()["items"]
            latest = items[0] if items else None
            if latest and latest["status"] in ("succeeded", "failed"):
                break
            time.sleep(0.1)
    items = smoke_client.get(
        f"/api/v1/ingestion/sync-jobs/{job_id}/runs",
        headers=auth_headers,
    ).json()["items"]
    assert len(items) >= 2
    starts = [i["started_at"] for i in items]
    assert starts == sorted(starts, reverse=True)
    smoke_client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


@patch("app.ingestion.sync_executor._fetch_mysql_rows", side_effect=ConnectionError("mock source down"))
def test_l1_mock_smoke_source_failure(mock_fetch, smoke_client, auth_headers):
    """T-D05-02: mock L1 源失败 → failed + errorMessage + traceId。"""
    payload = {
        "name": "l1-mock-fail",
        "source": {
            "type": "mysql",
            "host": "127.0.0.1",
            "port": 3307,
            "database": "sample_db",
            "username": "sample",
            "password": "sample",
            "table": "dirty_orders",
        },
        "target_table": "orders_mock_fail",
        "schedule_cron": None,
    }
    create = smoke_client.post("/api/v1/ingestion/sync-jobs", json=payload, headers=auth_headers)
    job_id = create.json()["id"]
    trace_headers = {**auth_headers, "X-Trace-Id": "mock-l1-fail-trace"}
    run = smoke_client.post(
        f"/api/v1/ingestion/sync-jobs/{job_id}/run",
        headers=trace_headers,
    )
    assert run.status_code == 202
    run_id = run.json()["run_id"]

    deadline = time.time() + 15
    final = None
    while time.time() < deadline:
        listed = smoke_client.get(
            f"/api/v1/ingestion/sync-jobs/{job_id}/runs",
            headers=auth_headers,
        )
        match = next((i for i in listed.json()["items"] if i["id"] == run_id), None)
        if match and match["status"] in ("succeeded", "failed"):
            final = match
            break
        time.sleep(0.1)

    assert final is not None
    assert final["status"] == "failed"
    assert final["trace_id"] == "mock-l1-fail-trace"
    assert final["error_message"] is not None
    assert "mock source down" in final["error_message"]

    smoke_client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)


@patch("app.ingestion.sync_executor._write_analytics", return_value=2)
@patch("app.ingestion.sync_executor._fetch_mysql_rows", return_value=MOCK_ROWS)
def test_l1_mock_smoke_end_to_end_under_three_seconds(
    mock_fetch, mock_write, smoke_client, auth_headers
):
    """T-L1-04: mock L1 全流程 create+rules+run+history 耗时 <3.0s。"""
    payload = {
        "name": "l1-perf-smoke",
        "source": {
            "type": "mysql",
            "host": "127.0.0.1",
            "port": 3307,
            "database": "sample_db",
            "username": "sample",
            "password": "sample",
            "table": "dirty_orders",
        },
        "target_table": "orders_perf_l1",
        "schedule_cron": None,
    }
    start = time.perf_counter()

    create = smoke_client.post("/api/v1/ingestion/sync-jobs", json=payload, headers=auth_headers)
    assert create.status_code == 201
    job_id = create.json()["id"]

    put_rules = smoke_client.put(
        f"/api/v1/ingestion/sync-jobs/{job_id}/etl-rules",
        json={"rules": L1_RULES},
        headers=auth_headers,
    )
    assert put_rules.status_code == 200

    run = smoke_client.post(
        f"/api/v1/ingestion/sync-jobs/{job_id}/run",
        headers=auth_headers,
    )
    assert run.status_code == 202
    run_id = run.json()["run_id"]

    deadline = time.time() + 10
    final = None
    while time.time() < deadline:
        listed = smoke_client.get(
            f"/api/v1/ingestion/sync-jobs/{job_id}/runs",
            headers=auth_headers,
        )
        match = next((i for i in listed.json()["items"] if i["id"] == run_id), None)
        if match and match["status"] in ("succeeded", "failed"):
            final = match
            break
        time.sleep(0.05)

    elapsed = time.perf_counter() - start
    assert final is not None
    assert final["status"] == "succeeded"
    assert elapsed < 3.0

    smoke_client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)
