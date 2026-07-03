from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_prd_f16_data_source_connection_field_anchors():
    """T-D05-03: F16-DATA.md 含 SourceConnection 字段表关键字。"""
    text = (ROOT / "docs/automate/prd/F16-DATA.md").read_text(encoding="utf-8")
    assert "SourceConnection" in text
    for field in ("type", "host", "password", "table"):
        assert field in text


def test_services_ingestion_symbol_anchors():
    """T-D05-04: ingestion.md 含 sync_executor/etl_rules/scheduler 锚点。"""
    text = (ROOT / "docs/services/ingestion.md").read_text(encoding="utf-8")
    for symbol in (
        "ingestion.sync_executor",
        "ingestion.etl_rules",
        "ingestion.scheduler",
    ):
        assert symbol in text
