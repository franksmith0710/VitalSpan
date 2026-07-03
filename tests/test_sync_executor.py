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


@patch("app.ingestion.sync_executor._write_analytics", return_value=1)
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    return_value=[
        {"product_name": "Widget A", "amount": "12.5", "status": "active", "note": None},
    ],
)
def test_run_job_write_receives_applied_rules(mock_fetch, mock_write):
    """T-ETL-08: mock_write 收到 apply_rules 后的行集。"""
    job_id = _seed_job_with_l1_rules()
    run_job(job_id, "trace-etl-pipeline")
    run = _latest_run(job_id)
    assert run.status == "succeeded"
    written_rows = mock_write.call_args[0][1]
    assert len(written_rows) == 1
    row = written_rows[0]
    assert row["product"] == "Widget A"
    assert row["amount"] == 12.5
    assert row["note"] == "无备注"
    assert "product_name" not in row


from unittest.mock import MagicMock

from app.ingestion.sync_executor import INGESTION_MAX_ROWS


@patch("app.ingestion.sync_executor._write_analytics", return_value=0)
@patch("app.ingestion.sync_executor.pymysql.connect")
def test_run_job_respects_ingestion_max_rows_limit(mock_connect, mock_write):
    """T-D02-09: cursor.execute 的 LIMIT 参数为 INGESTION_MAX_ROWS。"""
    cursor = MagicMock()
    cursor.fetchall.return_value = []
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    mock_connect.return_value = conn

    job_id = _seed_job()
    run_job(job_id, "trace-limit-sql")
    sql, params = cursor.execute.call_args[0]
    assert "LIMIT" in sql.upper()
    assert params == (INGESTION_MAX_ROWS,)


@patch("app.ingestion.sync_executor._fetch_mysql_rows", side_effect=ConnectionError("always down"))
def test_run_job_trace_id_preserved_on_final_failure(mock_fetch):
    """T-D02-10: 源始终失败 → failed 且 trace_id 保持入参。"""
    job_id = _seed_job()
    run_job(job_id, "trace-preserved-fail")
    run = _latest_run(job_id)
    assert run.status == "failed"
    assert run.trace_id == "trace-preserved-fail"


@patch("app.ingestion.sync_executor._write_analytics")
@patch("app.ingestion.sync_executor._fetch_mysql_rows")
def test_run_job_write_row_count_matches_rows_synced(mock_fetch, mock_write):
    """T-D02-11: mock_write 收到 len(rows) 与 rows_synced 一致。"""
    rows = [
        {"product_name": "A", "amount": "1", "status": "active", "note": None},
        {"product_name": "B", "amount": "2", "status": "active", "note": None},
        {"product_name": "C", "amount": "3", "status": "active", "note": None},
    ]
    mock_fetch.return_value = rows
    mock_write.return_value = len(rows)
    job_id = _seed_job()
    run_job(job_id, "trace-batch-count")
    run = _latest_run(job_id)
    assert run.rows_synced == len(rows)
    written = mock_write.call_args[0][1]
    assert len(written) == len(rows)


import time

from app.ingestion.etl_rules import apply_rules


def test_apply_rules_5000_rows_under_two_seconds():
    """T-D02-13: 5000 行经 apply_rules（空规则）耗时 <2.0s。"""
    rows = [{"idx": i, "status": "active"} for i in range(5000)]
    start = time.perf_counter()
    result = apply_rules(rows, [])
    elapsed = time.perf_counter() - start
    assert len(result) == 5000
    assert elapsed < 2.0


@patch("app.ingestion.sync_executor._write_analytics", return_value=0)
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    return_value=[
        {"status": "deleted", "amount": "1"},
        {"status": "deleted", "amount": "2"},
    ],
)
def test_run_job_filter_removes_all_rows_writes_empty(mock_fetch, mock_write):
    """T-D02-14: 过滤规则剔除全部行 → write 收到 []、rows_synced == 0。"""
    db = get_meta_session()
    job = SyncJob(
        name="filter-all-job",
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="db",
        source_username="u",
        source_password_encrypted=encrypt_password("p"),
        source_table="t",
        target_table="tgt_empty",
        enabled=True,
    )
    db.add(job)
    db.flush()
    db.add(
        EtlRuleSet(
            job_id=job.id,
            rules=[{"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"}],
        )
    )
    db.commit()
    job_id = job.id
    db.close()

    run_job(job_id, "trace-filter-all")
    run = _latest_run(job_id)
    assert run.status == "succeeded"
    assert run.rows_synced == 0
    written_rows = mock_write.call_args[0][1]
    assert written_rows == []


@patch("app.ingestion.sync_executor._write_analytics", return_value=1)
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    return_value=[{"amount": "bad", "note": None}],
)
def test_run_job_cast_fail_then_fill_null(mock_fetch, mock_write):
    """T-ETL-12: cast 失败变 None + fill_null 补救后 write 收到填充值。"""
    db = get_meta_session()
    job = SyncJob(
        name="dirty-cast-job",
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="db",
        source_username="u",
        source_password_encrypted=encrypt_password("p"),
        source_table="t",
        target_table="tgt_dirty",
        enabled=True,
    )
    db.add(job)
    db.flush()
    db.add(
        EtlRuleSet(
            job_id=job.id,
            rules=[
                {"type": "cast_type", "column": "amount", "to": "float"},
                {"type": "fill_null", "column": "note", "value": "无备注"},
            ],
        )
    )
    db.commit()
    job_id = job.id
    db.close()

    run_job(job_id, "trace-dirty-cast")
    run = _latest_run(job_id)
    assert run.status == "succeeded"
    written = mock_write.call_args[0][1][0]
    assert written["amount"] is None
    assert written["note"] == "无备注"


@patch("app.ingestion.sync_executor._write_analytics", return_value=1000)
@patch("app.ingestion.sync_executor._fetch_mysql_rows")
def test_run_job_large_batch_row_count(mock_fetch, mock_write):
    """T-D02-16: 大批量 mock fetch 1000 行 → rows_synced==1000 且 write 收到 1000 行。"""
    rows = [
        {"product_name": f"A{i}", "amount": "1", "status": "active", "note": None}
        for i in range(1000)
    ]
    mock_fetch.return_value = rows
    job_id = _seed_job()
    run_job(job_id, "trace-large-batch")
    run = _latest_run(job_id)
    assert run.status == "succeeded"
    assert run.rows_synced == 1000
    written_rows = mock_write.call_args[0][1]
    assert len(written_rows) == 1000


@patch("app.ingestion.sync_executor._fetch_mysql_rows", side_effect=ConnectionError("always fails"))
def test_run_job_retry_exhausted_preserves_trace_and_error(mock_fetch):
    """T-D02-17: 重试耗尽 → failed + trace_id 保持 + error_message 非空且 ≤500。"""
    job_id = _seed_job()
    run_job(job_id, "trace-retry-final")
    run = _latest_run(job_id)
    assert run.status == "failed"
    assert run.trace_id == "trace-retry-final"
    assert run.error_message is not None
    assert "always fails" in run.error_message
    assert run.retry_count >= 1
    assert len(run.error_message) <= 500
    assert mock_fetch.call_count >= 2
