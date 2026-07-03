from app.ingestion.etl_rules import apply_rules

DIRTY_ROWS = [
    {"product_name": "A", "amount": "12.5", "status": "active", "note": None},
    {"product_name": "B", "amount": "x", "status": "deleted", "note": "x"},
]

RULES = [
    {"type": "rename_column", "from": "product_name", "to": "product"},
    {"type": "cast_type", "column": "amount", "to": "float"},
    {"type": "fill_null", "column": "note", "value": "无备注"},
    {"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"},
]


def test_apply_rules_renames_casts_fills_and_filters():
    result = apply_rules(DIRTY_ROWS, RULES)
    assert len(result) == 1
    row = result[0]
    assert row["product"] == "A"
    assert row["amount"] == 12.5
    assert row["note"] == "无备注"
    assert "product_name" not in row


def test_cast_type_invalid_becomes_none():
    rows = [{"amount": "bad"}]
    rules = [{"type": "cast_type", "column": "amount", "to": "float"}]
    assert apply_rules(rows, rules)[0]["amount"] is None


DIRTY_ORDERS_SUBSET = [
    {"product_name": "Widget A", "amount": "12.5", "status": "active", "note": None},
    {"product_name": "Widget B", "amount": "not-a-number", "status": "active", "note": "脏金额"},
    {"product_name": "Widget C", "amount": "99", "status": "deleted", "note": "应过滤"},
    {"product_name": "Widget D", "amount": "0", "status": "active", "note": None},
]

L1_RULE_CHAIN = [
    {"type": "rename_column", "from": "product_name", "to": "product"},
    {"type": "cast_type", "column": "amount", "to": "float"},
    {"type": "fill_null", "column": "note", "value": "无备注"},
    {"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"},
]


def test_rename_column_only():
    rows = [{"a": 1, "b": 2}]
    rules = [{"type": "rename_column", "from": "a", "to": "x"}]
    result = apply_rules(rows, rules)
    assert result[0]["x"] == 1
    assert "a" not in result[0]


def test_cast_type_integer():
    rows = [{"amount": "42.0"}]
    rules = [{"type": "cast_type", "column": "amount", "to": "integer"}]
    assert apply_rules(rows, rules)[0]["amount"] == 42


def test_fill_null_only():
    rows = [{"note": None}, {"note": ""}]
    rules = [{"type": "fill_null", "column": "note", "value": "无备注"}]
    result = apply_rules(rows, rules)
    assert result[0]["note"] == "无备注"
    assert result[1]["note"] == "无备注"


def test_filter_rows_eq():
    rows = [{"status": "active"}, {"status": "deleted"}]
    rules = [{"type": "filter_rows", "column": "status", "op": "eq", "value": "active"}]
    assert len(apply_rules(rows, rules)) == 1


def test_filter_rows_is_null():
    rows = [{"note": None}, {"note": ""}, {"note": "ok"}]
    rules = [{"type": "filter_rows", "column": "note", "op": "is_null", "value": None}]
    assert len(apply_rules(rows, rules)) == 2


def test_rule_chain_dirty_orders_subset():
    result = apply_rules(DIRTY_ORDERS_SUBSET, L1_RULE_CHAIN)
    assert len(result) == 3
    widget_a = next(r for r in result if r["product"] == "Widget A")
    assert widget_a["note"] == "无备注"
    assert widget_a["amount"] == 12.5
    widget_b = next(r for r in result if r["product"] == "Widget B")
    assert widget_b["amount"] is None
    assert all(r["product"] != "Widget C" for r in result)
