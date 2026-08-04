from app.ingestion.sync_source_capabilities import (
    is_sync_fetch_implemented,
    is_sync_source_capable,
    resolve_sync_fetch_mode,
)


def test_sync_capable_matches_query_capable_catalog():
    assert is_sync_source_capable("mysql")
    assert is_sync_source_capable("postgresql")
    assert is_sync_source_capable("csv")
    assert not is_sync_source_capable("hive")
    assert not is_sync_source_capable("trino")


def test_sync_fetch_mode():
    assert resolve_sync_fetch_mode("tidb") == "sql"
    assert resolve_sync_fetch_mode("mongodb") == "native"
    assert resolve_sync_fetch_mode("hive") is None


def test_sync_fetch_implemented_matrix():
    assert is_sync_fetch_implemented("mysql")
    assert is_sync_fetch_implemented("kingbase")
    assert is_sync_fetch_implemented("csv")
    assert not is_sync_fetch_implemented("clickhouse")
    assert not is_sync_fetch_implemented("hive")
