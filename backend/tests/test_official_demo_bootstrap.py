"""official_demo_bootstrap 单元测试。"""

from __future__ import annotations

from app.dashboard.templates.official_demo_bootstrap import (
    _discover_migration_versions,
    _latest_migration_version,
    _split_sql_statements,
)


def test_discover_migration_versions() -> None:
    versions = _discover_migration_versions()
    assert versions == [1, 2, 3]


def test_latest_migration_version_matches_files() -> None:
    assert _latest_migration_version() == 3


def test_split_sql_statements_skips_empty_and_comments() -> None:
    parts = _split_sql_statements(
        "-- header\nCREATE TABLE t (id INT);\n\n-- tail\nSELECT 1;",
    )
    assert parts == ["CREATE TABLE t (id INT)", "SELECT 1"]
