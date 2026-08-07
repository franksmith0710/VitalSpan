"""Register a CJK-capable font for reportlab PDF export."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

FONT_NAME = "VitalSpanCJK"

_FONT_CANDIDATES: tuple[Path, ...] = (
    Path(r"C:/Windows/Fonts/msyh.ttc"),
    Path(r"C:/Windows/Fonts/msyhbd.ttc"),
    Path(r"C:/Windows/Fonts/simsun.ttc"),
    Path(r"C:/Windows/Fonts/simhei.ttf"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
    Path("/System/Library/Fonts/PingFang.ttc"),
    Path("/System/Library/Fonts/STHeiti Light.ttc"),
)


@lru_cache(maxsize=1)
def resolve_report_pdf_font_name() -> str:
    """Return registered CJK font name, or Helvetica when no font file is available."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    if FONT_NAME in pdfmetrics.getRegisteredFontNames():
        return FONT_NAME

    for path in _FONT_CANDIDATES:
        if not path.is_file():
            continue
        try:
            if path.suffix.lower() == ".ttc":
                pdfmetrics.registerFont(TTFont(FONT_NAME, str(path), subfontIndex=0))
            else:
                pdfmetrics.registerFont(TTFont(FONT_NAME, str(path)))
            return FONT_NAME
        except Exception:
            continue
    return "Helvetica"
