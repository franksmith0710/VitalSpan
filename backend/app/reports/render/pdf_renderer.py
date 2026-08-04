"""PDF renderer from report sections (reportlab)."""

from __future__ import annotations

import io
from typing import Any


def render_pdf(title: str, sections: list[dict[str, Any]]) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as exc:
        raise RuntimeError("reportlab not installed") from exc

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    story: list = [Paragraph(title, styles["Title"]), Spacer(1, 12)]
    for idx, section in enumerate(sections):
        label = section.get("metricKey") or section.get("kind") or f"Section {idx + 1}"
        story.append(Paragraph(str(label), styles["Heading2"]))
        cols = section.get("columns") or []
        rows = section.get("rows") or []
        if cols and rows:
            data = [cols] + [[str(c) for c in row] for row in rows]
            table = Table(data, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]))
            story.append(table)
        elif section.get("placeholder"):
            story.append(Paragraph("(no data)", styles["Normal"]))
        story.append(Spacer(1, 12))
    doc.build(story)
    return buf.getvalue()
