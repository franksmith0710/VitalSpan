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
