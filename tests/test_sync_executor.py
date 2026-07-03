import os
import uuid
from unittest.mock import patch

import pytest
from sqlalchemy import select, text

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///file:sync_exec_test?mode=memory&cache=shared&uri=true"
os.environ.setdefault(
    "ANALYTICS_DATABASE_URL",
    "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics",
)

from app.core.config import get_settings
from app.ingestion.models import Base, EtlRuleSet, SyncJob, SyncRun, encrypt_password, get_meta_engine, get_meta_session
from app.ingestion.sync_executor import run_job

get_settings.cache_clear()
get_meta_engine.cache_clear()


@pytest.fixture(scope="module", autouse=True)
def ensure_tables():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM ingestion_sync_runs"))
        conn.execute(text("DELETE FROM ingestion_etl_rules"))
        conn.execute(text("DELETE FROM ingestion_sync_jobs"))


def _seed_job() -> uuid.UUID:
    db = get_meta_session()
    job = SyncJob(
        name="mock-job",
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="sample_db",
        source_username="sample",
        source_password_encrypted=encrypt_password("sample"),
        source_table="dirty_orders",
        target_table="orders_mock",
        enabled=True,
    )
    db.add(job)
    db.flush()
    db.add(EtlRuleSet(job_id=job.id, rules=[]))
    db.commit()
    job_id = job.id
    db.close()
    return job_id


def _seed_postgres_job() -> uuid.UUID:
    db = get_meta_session()
    job = SyncJob(
        name="postgres-job",
        source_type="postgres",
        source_host="127.0.0.1",
        source_port=5432,
        source_database="pg_db",
        source_username="pg",
        source_password_encrypted=encrypt_password("pg"),
        source_table="orders",
        target_table="orders_pg",
        enabled=True,
    )
    db.add(job)
    db.flush()
    db.add(EtlRuleSet(job_id=job.id, rules=[]))
    db.commit()
    job_id = job.id
    db.close()
    return job_id


def _seed_job_with_l1_rules() -> uuid.UUID:
    db = get_meta_session()
    job = SyncJob(
        name="rules-job",
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="sample_db",
        source_username="sample",
        source_password_encrypted=encrypt_password("sample"),
        source_table="dirty_orders",
        target_table="orders_rules",
        enabled=True,
    )
    db.add(job)
    db.flush()
    db.add(
        EtlRuleSet(
            job_id=job.id,
            rules=[
                {"type": "rename_column", "from": "product_name", "to": "product"},
                {"type": "cast_type", "column": "amount", "to": "float"},
                {"type": "fill_null", "column": "note", "value": "无备注"},
                {"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"},
            ],
        )
    )
    db.commit()
    job_id = job.id
    db.close()
    return job_id


def _latest_run(job_id: uuid.UUID) -> SyncRun:
    db = get_meta_session()
    run = db.scalar(select(SyncRun).where(SyncRun.job_id == job_id).order_by(SyncRun.started_at.desc()))
    db.close()
    assert run is not None
    return run


@patch("app.ingestion.sync_executor._write_analytics", return_value=2)
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    return_value=[
        {"product_name": "A", "amount": "1", "status": "active", "note": None},
        {"product_name": "B", "amount": "2", "status": "active", "note": None},
    ],
)
def test_run_job_success_applies_rules_and_writes(mock_fetch, mock_write):
    job_id = _seed_job()
    run_job(job_id, "trace-success")
    run = _latest_run(job_id)
    assert run.status == "succeeded"
    assert run.rows_synced == 2
    assert run.error_message is None
    assert run.trace_id == "trace-success"
    mock_fetch.assert_called_once()
    mock_write.assert_called_once()


@patch("app.ingestion.sync_executor._fetch_mysql_rows", side_effect=ConnectionError("mysql down"))
def test_run_job_source_failure_retries_then_failed(mock_fetch):
    job_id = _seed_job()
    run_job(job_id, "trace-fail-src")
    run = _latest_run(job_id)
    assert run.status == "failed"
    assert run.retry_count >= 1
    assert run.error_message is not None
    assert "mysql down" in run.error_message
    assert mock_fetch.call_count >= 2


@patch("app.ingestion.sync_executor.get_settings")
def test_run_job_analytics_not_configured(mock_settings):
    mock_settings.return_value.analytics_database_url = None
    job_id = _seed_job()
    run_job(job_id, "trace-no-analytics")
    run = _latest_run(job_id)
    assert run.status == "failed"
    assert "ANALYTICS" in (run.error_message or "")


@patch("app.ingestion.sync_executor._write_analytics", side_effect=RuntimeError("write failed"))
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    return_value=[{"product_name": "A", "amount": "1", "status": "active", "note": None}],
)
def test_run_job_write_failure(mock_fetch, mock_write):
    job_id = _seed_job()
    run_job(job_id, "trace-write-fail")
    run = _latest_run(job_id)
    assert run.status == "failed"
    assert run.retry_count >= 1
    assert "write failed" in (run.error_message or "")


def test_run_job_missing_job():
    missing = uuid.uuid4()
    run_job(missing, "trace-missing")
    db = get_meta_session()
    run = db.scalar(select(SyncRun).where(SyncRun.trace_id == "trace-missing"))
    db.close()
    assert run is not None
    assert run.status == "failed"
    assert run.error_message == "任务不存在"


def test_run_job_rejects_non_mysql_source():
    """T-D02-04: source_type != mysql → failed + 可读错误。"""
    job_id = _seed_postgres_job()
    run_job(job_id, "trace-postgres-reject")
    run = _latest_run(job_id)
    assert run.status == "failed"
    assert "mysql" in (run.error_message or "").lower()


@patch("app.ingestion.sync_executor._write_analytics", return_value=0)
@patch("app.ingestion.sync_executor._fetch_mysql_rows", return_value=[])
def test_run_job_empty_rows_succeeds_with_zero(mock_fetch, mock_write):
    """T-D02-05: 空行集 → succeeded + rows_synced == 0。"""
    job_id = _seed_job()
    run_job(job_id, "trace-empty-rows")
    run = _latest_run(job_id)
    assert run.status == "succeeded"
    assert run.rows_synced == 0
    mock_write.assert_called_once()
    _job_arg, written_rows = mock_write.call_args[0]
    assert written_rows == []


@patch("app.ingestion.sync_executor._write_analytics", return_value=1)
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    side_effect=[
        ConnectionError("transient mysql"),
        [{"product_name": "A", "amount": "1", "status": "active", "note": None}],
    ],
)
def test_run_job_retry_reuses_same_run_id(mock_fetch, mock_write):
    """T-D02-06: 重试同一 run_id，不产生 duplicate run 行。"""
    job_id = _seed_job()
    run_job(job_id, "trace-retry-idempotent")
    db = get_meta_session()
    runs = list(db.scalars(select(SyncRun).where(SyncRun.job_id == job_id)).all())
    db.close()
    assert len(runs) == 1
    assert runs[0].trace_id == "trace-retry-idempotent"
    assert runs[0].retry_count >= 1
    assert runs[0].status == "succeeded"
    assert mock_fetch.call_count == 2
