from __future__ import annotations

from typing import Any, Literal

SurfaceKindFilter = Literal["dashboard", "data-screen"]


def read_surface_kind_from_layout(layout_json: dict[str, Any] | None) -> SurfaceKindFilter:
    if not layout_json:
        return "dashboard"
    style = layout_json.get("styleConfig") or layout_json.get("style_config") or {}
    if not isinstance(style, dict):
        return "dashboard"
    kind = style.get("surfaceKind") or style.get("surface_kind")
    return "data-screen" if kind == "data-screen" else "dashboard"


def matches_surface_filter(
    layout_json: dict[str, Any] | None,
    surface_kind: SurfaceKindFilter | None,
) -> bool:
    if surface_kind is None:
        return True
    actual = read_surface_kind_from_layout(layout_json)
    if surface_kind == "data-screen":
        return actual == "data-screen"
    return actual != "data-screen"
