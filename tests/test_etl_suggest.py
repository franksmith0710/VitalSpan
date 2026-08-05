from app.ingestion.etl_suggest import suggest_etl_rules_from_columns


def test_suggest_cast_for_string_like_amount_column() -> None:
    rules = suggest_etl_rules_from_columns(
        [
            {"name": "amount", "dataType": "varchar"},
            {"name": "id", "dataType": "int"},
        ],
    )
    assert {"type": "cast_type", "column": "amount", "to": "float"} in rules
    assert not any(rule.get("column") == "id" for rule in rules)


def test_suggest_status_deleted_filter() -> None:
    rules = suggest_etl_rules_from_columns([{"name": "status", "dataType": "varchar"}])
    assert {
        "type": "filter_rows",
        "column": "status",
        "op": "ne",
        "value": "deleted",
    } in rules


def test_suggest_rename_product_name_column() -> None:
    rules = suggest_etl_rules_from_columns([{"name": "product_name", "dataType": "varchar"}])
    assert {"type": "rename_column", "from": "product_name", "to": "product"} in rules


def test_suggest_fill_null_for_note_column() -> None:
    rules = suggest_etl_rules_from_columns([{"name": "note", "dataType": "text"}])
    assert {"type": "fill_null", "column": "note", "value": "无备注"} in rules


def test_suggest_full_fixture_chain() -> None:
    rules = suggest_etl_rules_from_columns(
        [
            {"name": "product_name", "dataType": "varchar"},
            {"name": "amount", "dataType": "varchar"},
            {"name": "note", "dataType": "text"},
            {"name": "status", "dataType": "varchar"},
        ],
    )
    assert {"type": "rename_column", "from": "product_name", "to": "product"} in rules
    assert {"type": "cast_type", "column": "amount", "to": "float"} in rules
    assert {"type": "fill_null", "column": "note", "value": "无备注"} in rules
    assert {
        "type": "filter_rows",
        "column": "status",
        "op": "ne",
        "value": "deleted",
    } in rules
