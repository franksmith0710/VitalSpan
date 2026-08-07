"""Report PDF export must render CJK text when system fonts are unavailable."""

from __future__ import annotations

from app.reports.render import pdf_fonts
from app.reports.render.pdf_renderer import render_pdf


def test_resolve_report_pdf_font_falls_back_to_cid(monkeypatch) -> None:
    pdf_fonts.resolve_report_pdf_font_name.cache_clear()
    monkeypatch.setattr(pdf_fonts, "_FONT_CANDIDATES", ())
    font = pdf_fonts.resolve_report_pdf_font_name()
    assert font == pdf_fonts.CID_FONT_NAME


def test_render_pdf_contains_cjk_bytes(monkeypatch) -> None:
    pdf_fonts.resolve_report_pdf_font_name.cache_clear()
    monkeypatch.setattr(pdf_fonts, "_FONT_CANDIDATES", ())
    data = render_pdf(
        "演示销售报表",
        [
            {
                "metricKey": "demo2",
                "columns": ["province", "amount"],
                "rows": [["北京", "100"]],
            }
        ],
    )
    assert data.startswith(b"%PDF")
    assert b"\xe6\xbc\x94\xe7\xa4\xba" in data or b"STSong-Light" in data
