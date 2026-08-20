from __future__ import annotations

import re
from dataclasses import dataclass

from app.ai_viz.models import _resolve_runtime

_STYLE_PAYLOAD_RE = re.compile(
    r"(?:payload|\bp\b|\bst\b)\s*(?:&&\s*(?:p|payload))?\s*\.\s*style",
    re.IGNORECASE,
)
_STYLE_TOKEN_RE = re.compile(r"--vs-(?:style|palette)-", re.IGNORECASE)
_LAYOUT_FALLBACK_RE = re.compile(r"clientWidth\s*\|\|\s*320")


@dataclass(frozen=True, slots=True)
class StyleComplianceWarning:
    code: str
    message: str


def _bundle_source(files: dict[str, str]) -> str:
    return "\n".join(files[name] for name in sorted(files))


def collect_bundle_style_compliance_warnings(
    files: dict[str, str],
    entry: str,
    manifest: dict,
) -> list[StyleComplianceWarning]:
    """Non-blocking style compliance hints for POST/PUT artifact ingest."""
    combined = _bundle_source(files)
    entry_html = files.get(entry, "")
    runtime = _resolve_runtime(manifest)
    warnings: list[StyleComplianceWarning] = []

    if runtime == "html" and "vsCv.mount" not in entry_html:
        warnings.append(
            StyleComplianceWarning(
                code="AIVIZ_WARN_MOUNT_RECOMMENDED",
                message="html runtime 建议使用 host.vsCv.mount(renderFn)，否则 resize 与样式更新可能不稳定",
            )
        )

    has_style_payload = bool(_STYLE_PAYLOAD_RE.search(combined))
    has_style_tokens = bool(_STYLE_TOKEN_RE.search(combined))
    if not has_style_payload and not has_style_tokens:
        warnings.append(
            StyleComplianceWarning(
                code="AIVIZ_WARN_STYLE_COMPLIANCE",
                message=(
                    "bundle 未引用 payload.style 或 --vs-style-* / --vs-palette-*，"
                    "样式面板与看板配色可能不会生效"
                ),
            )
        )

    if _LAYOUT_FALLBACK_RE.search(combined) and "p.layout" not in combined and "payload.layout" not in combined:
        warnings.append(
            StyleComplianceWarning(
                code="AIVIZ_WARN_LAYOUT_FALLBACK",
                message="检测到 clientWidth || 320 作为尺寸兜底；建议优先读取 payload.layout",
            )
        )

    return warnings
