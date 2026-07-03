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


def test_api_readme_section9_ingestion_routes():
    """T-D05-05: api/README.md §9 含 sync-jobs 与 source 字段。"""
    text = (ROOT / "docs/api/README.md").read_text(encoding="utf-8")
    assert "/api/v1/ingestion/sync-jobs" in text
    assert "source" in text
    assert "SourceConnection" in text or '"type"' in text


def test_prd_f16_data005_acceptance_test_anchors():
    """T-D05-06: F16-DATA DATA-005 验收含 test_ingestion 锚点。"""
    text = (ROOT / "docs/automate/prd/F16-DATA.md").read_text(encoding="utf-8")
    assert "DATA-005" in text
    assert "test_ingestion" in text


def test_services_ingestion_implemented_status():
    """T-D05-07: ingestion.md 状态为已实现。"""
    text = (ROOT / "docs/services/ingestion.md").read_text(encoding="utf-8")
    assert "已实现" in text
