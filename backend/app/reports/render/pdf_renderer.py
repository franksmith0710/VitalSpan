"""PDF renderer from report sections (reportlab)."""

from __future__ import annotations

import io
from typing import Any

from app.reports.render.pdf_fonts import resolve_report_pdf_font_name


def render_pdf(title: str, sections: list[dict[str, Any]]) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as exc:
        raise RuntimeError("reportlab not installed") from exc

    font_name = resolve_report_pdf_font_name()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName=font_name,
    )
    heading_style = ParagraphStyle(
        "ReportHeading",
        parent=styles["Heading2"],
        fontName=font_name,
    )
    story: list = [Paragraph(title, title_style), Spacer(1, 12)]
    for idx, section in enumerate(sections):
        label = section.get("metricKey") or section.get("kind") or f"Section {idx + 1}"
        story.append(Paragraph(str(label), heading_style))
        cols = section.get("columns") or []
        rows = section.get("rows") or []
        if cols and rows:
            data = [cols] + [[str(c) for c in row] for row in rows]
            table = Table(data, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("FONTNAME", (0, 0), (-1, -1), font_name),
            ]))
            story.append(table)
        elif section.get("placeholder"):
            story.append(Paragraph("(no data)", styles["Normal"]))
        story.append(Spacer(1, 12))
    doc.build(story)
    return buf.getvalue()
