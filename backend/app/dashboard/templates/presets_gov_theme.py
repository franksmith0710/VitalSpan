"""政企模板视觉主题：浅色整齐 + 克制配色（TailAdmin 品牌蓝，无霓虹/深黑底图）。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from app.dashboard.templates.presets import _materialize_dash_style
from app.dashboard.templates.presets_gov_assets import (
    COMMUNITY_BG,
    DIGITAL_COCKPIT_BG,
    ECO_MONITOR_BG,
    EFFICIENCY_BG,
    EMERGENCY_BG,
    FINANCE_BG,
    GRID_BG,
    INVESTMENT_BG,
    SATISFACTION_BG,
    SMART_CITY_BG,
)

_BRAND = "#465fff"
_SLATE_400 = "#94a3b8"
_SLATE_500 = "#64748b"
_SLATE_600 = "#475569"
_TITLE_LIGHT = "#1e293b"
_LABEL_LIGHT = "#64748b"

_LIGHT_WIDGET: dict[str, Any] = {
    "background": "#ffffff",
    "backgroundShow": True,
    "borderEnabled": True,
    "borderColor": "#e2e8f0",
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderRadius": 8,
    "backdropBlur": 0,
    "padding": 12,
    "opacity": 1,
}


@dataclass(frozen=True)
class GovScreenTheme:
    accent: str
    canvas: str
    bg_image: str
    palette: tuple[str, ...]


@dataclass(frozen=True)
class GovDashTheme:
    accent: str
    scheme: Literal["light", "dark"]
    canvas: str
    bg_image: str
    palette: tuple[str, ...]


# —— 大屏：浅色底 + 单主色 ——
THEME_SMART_CITY = GovScreenTheme(
    accent="#2563eb",
    canvas="#f8fafc",
    bg_image=SMART_CITY_BG,
    palette=("#2563eb", "#3b82f6", "#60a5fa", _SLATE_600, _SLATE_500, _SLATE_400),
)
THEME_DIGITAL_COCKPIT = GovScreenTheme(
    accent="#4f46e5",
    canvas="#fafafa",
    bg_image=DIGITAL_COCKPIT_BG,
    palette=("#4f46e5", "#6366f1", "#818cf8", _SLATE_600, _SLATE_500, _SLATE_400),
)
THEME_EMERGENCY = GovScreenTheme(
    accent="#be123c",
    canvas="#fafafa",
    bg_image=EMERGENCY_BG,
    palette=("#be123c", "#e11d48", "#fb7185", _SLATE_600, _SLATE_500, _SLATE_400),
)
THEME_ECO = GovScreenTheme(
    accent="#047857",
    canvas="#f8fafc",
    bg_image=ECO_MONITOR_BG,
    palette=("#047857", "#059669", "#10b981", _SLATE_600, _SLATE_500, _SLATE_400),
)
THEME_COMMUNITY = GovScreenTheme(
    accent="#6d28d9",
    canvas="#fafafa",
    bg_image=COMMUNITY_BG,
    palette=("#6d28d9", "#7c3aed", "#8b5cf6", _SLATE_600, _SLATE_500, _SLATE_400),
)

# —— 看板 ——
THEME_EFFICIENCY = GovDashTheme(
    accent=_BRAND,
    scheme="light",
    canvas="#f8fafc",
    bg_image=EFFICIENCY_BG,
    palette=(_BRAND, "#6282ff", "#3b82f6", _SLATE_600, _SLATE_500, _SLATE_400),
)
THEME_SATISFACTION = GovDashTheme(
    accent=_BRAND,
    scheme="light",
    canvas="#fafafa",
    bg_image=SATISFACTION_BG,
    palette=(_BRAND, "#6366f1", "#3b82f6", _SLATE_600, _SLATE_500, "#cbd5e1"),
)
THEME_FINANCE = GovDashTheme(
    accent="#047857",
    scheme="light",
    canvas="#f8fafc",
    bg_image=FINANCE_BG,
    palette=("#047857", "#059669", "#10b981", _BRAND, _SLATE_500, "#99f6e4"),
)
THEME_INVESTMENT = GovDashTheme(
    accent="#4f46e5",
    scheme="light",
    canvas="#fafafa",
    bg_image=INVESTMENT_BG,
    palette=("#4f46e5", "#6366f1", "#3b82f6", _SLATE_600, _SLATE_500, _SLATE_400),
)
THEME_GRID = GovDashTheme(
    accent=_SLATE_600,
    scheme="light",
    canvas="#f8fafc",
    bg_image=GRID_BG,
    palette=(_SLATE_600, _SLATE_500, _BRAND, "#3b82f6", _SLATE_400, "#cbd5e1"),
)


def _apply_gov_light_style(
    style: dict[str, Any],
    *,
    accent: str,
    canvas: str,
    palette: tuple[str, ...],
    surface_kind: str,
) -> dict[str, Any]:
    style["surfaceKind"] = surface_kind
    style["colorScheme"] = "light"
    style["seriesGradient"] = False
    style["gapPreset"] = "md"
    style["canvasBackground"] = canvas
    style["canvasBackgroundCustom"] = True
    style["canvasDecorPresetId"] = "none"
    style["titleStyle"] = {
        "color": _TITLE_LIGHT,
        "fontSize": 13,
        "fontWeight": 600,
        "shadow": False,
    }
    style["chartLabelStyle"] = {"color": _LABEL_LIGHT}
    style["filterChromeStyle"] = {"titleColor": _LABEL_LIGHT}
    style["widgetStyle"] = {**_LIGHT_WIDGET}
    style["paletteId"] = "custom"
    style["paletteColors"] = list(palette)
    return style


def build_gov_screen_chrome_style(_theme: GovScreenTheme) -> dict[str, Any]:
    return {
        "titleBar": {
            "accentColor": "rgba(100, 116, 139, 0.35)",
            "titleColor": _TITLE_LIGHT,
            "showSideLines": False,
        },
        "clock": {
            "color": _SLATE_500,
            "fontSize": 14,
            "showWeekday": True,
            "showSeconds": True,
        },
    }


def build_gov_screen_style(theme: GovScreenTheme) -> dict[str, Any]:
    style = _materialize_dash_style(
        scheme="light",
        accent=theme.accent,
        decor=None,
        bg_image=theme.bg_image,
        palette_colors=list(theme.palette),
    )
    return _apply_gov_light_style(
        style,
        accent=theme.accent,
        canvas=theme.canvas,
        palette=theme.palette,
        surface_kind="data-screen",
    )


def build_gov_dash_style(theme: GovDashTheme) -> dict[str, Any]:
    style = _materialize_dash_style(
        scheme="light",
        accent=theme.accent,
        decor=None,
        bg_image=theme.bg_image,
        palette_colors=list(theme.palette),
    )
    return _apply_gov_light_style(
        style,
        accent=theme.accent,
        canvas=theme.canvas,
        palette=theme.palette,
        surface_kind="dashboard",
    )


def build_gov_chart_de_style(
    theme: GovScreenTheme | GovDashTheme,
    chart_type: str,
) -> dict[str, Any]:
    colors = list(theme.palette)
    accent = theme.accent
    label_color = _LABEL_LIGHT

    de_style: dict[str, Any] = {
        "seriesGradient": False,
        "label": {"show": chart_type not in ("kpi",), "color": label_color, "fontSize": 11},
        "legend": {
            "show": chart_type in ("pie", "bar", "line", "map"),
            "color": label_color,
            "fontSize": 11,
        },
        "border": {"show": False},
        "title": {"color": _TITLE_LIGHT, "fontSize": 13, "fontWeight": 600},
    }
    if chart_type == "map":
        de_style["geo"] = {
            "mapArea": "china",
            "visualMap": True,
            "areaColor": f"{accent}18",
            "borderColor": "rgba(148, 163, 184, 0.35)",
        }
    if chart_type in ("bar", "line", "pie", "gauge", "word-cloud", "kpi", "table-info"):
        de_style["paletteId"] = "custom"
        de_style["seriesColor"] = [
            {"name": f"series-{i}", "color": c} for i, c in enumerate(colors[:6])
        ]
    return de_style
