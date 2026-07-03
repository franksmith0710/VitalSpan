from __future__ import annotations

import pytest

from app.query.dialects import get_sql_dialect
from app.query.dialects.base import UnsupportedDialectError
from app.query.readonly import assert_readonly_sql


def test_clickhouse_dialect_registered():
    """T-Q-R27-004-01: clickhouse 已注册；unknown_type 仍抛 UnsupportedDialectError。"""
    d = get_sql_dialect("clickhouse")
    assert d.connector_type == "clickhouse"
    with pytest.raises(UnsupportedDialectError):
        get_sql_dialect("unknown_type")


def test_clickhouse_quote_identifier():
    """T-Q-R27-004-02: quote_identifier → backticks；非法名抛错。"""
    d = get_sql_dialect("clickhouse")
    assert d.quote_identifier("col") == "`col`"
    with pytest.raises(Exception):
        d.quote_identifier("bad-name")


def test_clickhouse_wrap_limit():
    """T-Q-R27-004-03: wrap_limit 后缀 LIMIT/OFFSET，无子查询包裹。"""
    d = get_sql_dialect("clickhouse")
    sql = d.wrap_limit("SELECT 1", limit=10, offset=2)
    assert "LIMIT 10" in sql
    assert "OFFSET 2" in sql
    assert "SELECT * FROM (" not in sql


def test_clickhouse_build_table_select_readonly():
    """T-Q-R27-004-04: build_table_select 经 assert_readonly_sql。"""
    sql = get_sql_dialect("clickhouse").build_table_select("db", "t", limit=50)
    assert_readonly_sql(sql)
