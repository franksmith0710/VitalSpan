"""Render EngineRenderSpec sections to document bytes."""

from __future__ import annotations

from typing import Any

from app.reports.render.excel_renderer import render_excel
from app.reports.render.pdf_renderer import render_pdf
from app.reports.render.word_renderer import render_word

_MIME = {
    "pdf": "application/pdf",
    "word": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def render_document(spec: dict[str, Any], fmt: str, *, title: str = "Report") -> bytes:
    sections = spec.get("sections") or []
    if fmt == "pdf":
        return render_pdf(title, sections)
    if fmt == "excel":
        return render_excel(title, sections)
    if fmt == "word":
        return render_word(title, sections)
    raise ValueError(f"unsupported format: {fmt}")


def content_type_for(fmt: str) -> str:
    return _MIME[fmt]
