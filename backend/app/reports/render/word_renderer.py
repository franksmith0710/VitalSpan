"""Word OOXML renderer from report sections."""

from __future__ import annotations

import io
import zipfile
from typing import Any
from xml.sax.saxutils import escape


def _table_xml(cols: list[str], rows: list[list]) -> str:
    header = "".join(f"<w:tc><w:p><w:r><w:t>{escape(str(c))}</w:t></w:r></w:p></w:tc>" for c in cols)
    body = ""
    for row in rows:
        cells = "".join(f"<w:tc><w:p><w:r><w:t>{escape(str(c))}</w:t></w:r></w:p></w:tc>" for c in row)
        body += f"<w:tr>{cells}</w:tr>"
    return f"<w:tbl><w:tr>{header}</w:tr>{body}</w:tbl>"


def render_word(title: str, sections: list[dict[str, Any]]) -> bytes:
    parts = [f"<w:p><w:r><w:t>{escape(title)}</w:t></w:r></w:p>"]
    for section in sections:
        label = section.get("metricKey") or section.get("kind") or "Section"
        parts.append(f"<w:p><w:r><w:t>{escape(str(label))}</w:t></w:r></w:p>")
        cols = section.get("columns") or []
        rows = section.get("rows") or []
        if cols and rows:
            parts.append(_table_xml(cols, rows))
        else:
            parts.append("<w:p><w:r><w:t>(no data)</w:t></w:r></w:p>")
    body = "".join(parts)
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Override PartName="/word/document.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            "</Types>",
        )
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            'Target="word/document.xml"/></Relationships>',
        )
        zf.writestr("word/document.xml", document)
    return buf.getvalue()
