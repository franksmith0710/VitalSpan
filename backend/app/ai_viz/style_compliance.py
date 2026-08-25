from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from app.ai_viz.models import _resolve_runtime

StyleComplianceTier = Literal["full", "partial", "visual-only"]

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


def _style_schema_properties(manifest: dict) -> dict:
    style_schema = manifest.get("styleSchema")
    if not isinstance(style_schema, dict):
        return {}
    properties = style_schema.get("properties")
    return properties if isinstance(properties, dict) else {}


def _read_style_hooks(manifest: dict) -> dict | None:
    hooks = manifest.get("styleHooks")
    return hooks if isinstance(hooks, dict) else None


def _hook_is_valid(key: str, hook: object) -> bool:
    if not isinstance(hook, dict):
        return False
    if hook.get("hideWhenFalse"):
        hide_selectors = hook.get("hideSelectors") or hook.get("selectors")
        return isinstance(hide_selectors, list) and len(hide_selectors) > 0
    selectors = hook.get("selectors")
    return isinstance(selectors, list) and len(selectors) > 0


def _collect_style_hook_warnings(manifest: dict) -> list[StyleComplianceWarning]:
    hooks = _read_style_hooks(manifest)
    if not hooks:
        return []

    properties = _style_schema_properties(manifest)
    warnings: list[StyleComplianceWarning] = []

    for key, hook in hooks.items():
        if key not in properties:
            warnings.append(
                StyleComplianceWarning(
                    code="AIVIZ_WARN_STYLE_HOOK_UNKNOWN_KEY",
                    message=f"manifest.styleHooks.{key} 未在 styleSchema.properties 中声明",
                )
            )
            continue
        if not _hook_is_valid(key, hook):
            warnings.append(
                StyleComplianceWarning(
                    code="AIVIZ_WARN_STYLE_HOOK_INVALID",
                    message=f"manifest.styleHooks.{key} 须声明 selectors 或 hideSelectors",
                )
            )

    return warnings


def has_valid_style_hooks(manifest: dict) -> bool:
    hooks = _read_style_hooks(manifest)
    if not hooks:
        return False
    properties = _style_schema_properties(manifest)
    if not properties:
        return False
    for key, hook in hooks.items():
        if key not in properties or not _hook_is_valid(key, hook):
            return False
    return True


def resolve_style_compliance_tier(
    warnings: list[StyleComplianceWarning],
    manifest: dict,
) -> StyleComplianceTier:
    codes = {item.code for item in warnings}
    if not codes:
        return "partial" if has_valid_style_hooks(manifest) else "full"
    if "AIVIZ_WARN_STYLE_COMPLIANCE" in codes:
        if "AIVIZ_WARN_STYLE_HOOK_INVALID" in codes or "AIVIZ_WARN_STYLE_HOOK_UNKNOWN_KEY" in codes:
            return "visual-only"
        return "partial"
    return "partial"


def _collect_field_slot_warnings(manifest: dict) -> list[StyleComplianceWarning]:
    field_slots = manifest.get("fieldSlots")
    if not isinstance(field_slots, dict):
        return []
    dim_rule = field_slots.get("dimensions")
    metric_rule = field_slots.get("metrics")
    if not isinstance(dim_rule, dict) or not isinstance(metric_rule, dict):
        return []
    dim_max = dim_rule.get("max") if isinstance(dim_rule.get("max"), int) else 1
    metric_min = metric_rule.get("min") if isinstance(metric_rule.get("min"), int) else 1
    metric_max = metric_rule.get("max") if isinstance(metric_rule.get("max"), int) else 1
    if dim_max > 1 and metric_min >= 1 and metric_max > 0:
        return [
            StyleComplianceWarning(
                code="AIVIZ_WARN_DETAIL_TABLE_METRICS",
                message=(
                    "fieldSlots 与 P2 多维明细范式不符：dimensions.max>1 时 metrics 须 min=0,max=0；"
                    "与 manifest.id 无关，请对齐金样或改 fieldSlots"
                ),
            )
        ]
    return []


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

    warnings.extend(_collect_field_slot_warnings(manifest))
    warnings.extend(_collect_style_hook_warnings(manifest))

    if runtime == "html" and "vsCv.mount" not in entry_html:
        warnings.append(
            StyleComplianceWarning(
                code="AIVIZ_WARN_MOUNT_RECOMMENDED",
                message="html runtime 建议使用 host.vsCv.mount(renderFn)，否则 resize 与样式更新可能不稳定",
            )
        )

    has_style_payload = bool(_STYLE_PAYLOAD_RE.search(combined))
    has_style_tokens = bool(_STYLE_TOKEN_RE.search(combined))
    if not has_style_payload and not has_style_tokens and not has_valid_style_hooks(manifest):
        warnings.append(
            StyleComplianceWarning(
                code="AIVIZ_WARN_STYLE_COMPLIANCE",
                message=(
                    "bundle 未引用 payload.style 或 --vs-style-* / --vs-palette-*，"
                    "且未提供有效 manifest.styleHooks；样式面板与看板配色可能不会生效"
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
