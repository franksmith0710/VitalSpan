"""政企模板视觉主题：稳重配色 + 简洁卡片（对标 TailAdmin 品牌色，避免霓虹杂色）。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from app.dashboard.templates.presets import _materialize_dash_style, _materialize_screen_style
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

# TailAdmin brand + 政务中性色
_BRAND = "#465fff"
_SLATE_400 = "#94a3b8"
_SLATE_500 = "#64748b"
_SLATE_600 = "#475569"
_TITLE_DARK = "#f1f5f9"
_LABEL_DARK = "#94a3b8"
_LABEL_LIGHT = "#64748b"
_TITLE_LIGHT = "#1e293b"

_DARK_WIDGET: dict[str, Any] = {
    "background": "rgba(22, 28, 42, 0.78)",
    "backgroundShow": True,
    "borderEnabled": True,
    "borderColor": "rgba(148, 163, 184, 0.12)",
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderRadius": 10,
    "backdropBlur": 6,
    "padding": 12,
    "opacity": 1,
}

_LIGHT_WIDGET: dict[str, Any] = {
    "background": "#ffffff",
    "backgroundShow": True,
    "borderEnabled": True,
    "borderColor": "#e2e8f0",
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderRadius": 10,
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


# —— 大屏：每套一主色 + 同色系低饱和延展 ——
THEME_SMART_CITY = GovScreenTheme(
    accent="#2563eb",
    canvas="#0b1120",
    bg_image=SMART_CITY_BG,
    palette=("#2563eb", "#3b82f6", "#60a5fa", _SLATE_500, _SLATE_400, "#1d4ed8"),
)
THEME_DIGITAL_COCKPIT = GovScreenTheme(
    accent="#4f46e5",
    canvas="#0c0a18",
    bg_image=DIGITAL_COCKPIT_BG,
    palette=("#4f46e5", "#6366f1", "#818cf8", _SLATE_500, _SLATE_400, "#4338ca"),
)
THEME_EMERGENCY = GovScreenTheme(
    accent="#be123c",
    canvas="#12080c",
    bg_image=EMERGENCY_BG,
    palette=("#be123c", "#e11d48", "#fb7185", _SLATE_500, _SLATE_400, "#9f1239"),
)
THEME_ECO = GovScreenTheme(
    accent="#047857",
    canvas="#061410",
    bg_image=ECO_MONITOR_BG,
    palette=("#047857", "#059669", "#10b981", _SLATE_500, _SLATE_400, "#065f46"),
)
THEME_COMMUNITY = GovScreenTheme(
    accent="#6d28d9",
    canvas="#0e0a14",
    bg_image=COMMUNITY_BG,
    palette=("#6d28d9", "#7c3aed", "#8b5cf6", _SLATE_500, _SLATE_400, "#5b21b6"),
)

# —— 看板：浅色政务报表风，品牌蓝/青绿点缀 ——
THEME_EFFICIENCY = GovDashTheme(
    accent=_BRAND,
    scheme="light",
    canvas="#f1f5f9",
    bg_image=EFFICIENCY_BG,
    palette=(_BRAND, "#6282ff", "#3b82f6", _SLATE_600, _SLATE_500, _SLATE_400),
)
THEME_SATISFACTION = GovDashTheme(
    accent=_BRAND,
    scheme="light",
    canvas="#f8fafc",
    bg_image=SATISFACTION_BG,
    palette=(_BRAND, "#6366f1", "#3b82f6", _SLATE_600, _SLATE_500, "#cbd5e1"),
)
THEME_FINANCE = GovDashTheme(
    accent="#0f766e",
    scheme="light",
    canvas="#f0fdf4",
    bg_image=FINANCE_BG,
    palette=("#0f766e", "#0d9488", "#14b8a6", _BRAND, _SLATE_500, "#99f6e4"),
)
THEME_INVESTMENT = GovDashTheme(
    accent="#2563eb",
    scheme="dark",
    canvas="#0b1120",
    bg_image=INVESTMENT_BG,
    palette=("#2563eb", "#3b82f6", "#6366f1", _SLATE_500, _SLATE_400, "#1d4ed8"),
)
THEME_GRID = GovDashTheme(
    accent=_SLATE_600,
    scheme="light",
    canvas="#f8fafc",
    bg_image=GRID_BG,
    palette=(_SLATE_600, _SLATE_500, _BRAND, "#3b82f6", _SLATE_400, "#cbd5e1"),
)


def build_gov_screen_chrome_style(_theme: GovScreenTheme) -> dict[str, Any]:
    """顶栏/时钟：去霓虹侧线，中性字色。"""
    return {
        "titleBar": {
            "accentColor": "rgba(148, 163, 184, 0.4)",
            "titleColor": _TITLE_DARK,
            "showSideLines": False,
        },
        "clock": {
            "color": _SLATE_400,
            "fontSize": 15,
            "showWeekday": True,
            "showSeconds": True,
        },
    }


def build_gov_screen_style(theme: GovScreenTheme) -> dict[str, Any]:
    style = _materialize_screen_style(
        accent=theme.accent,
        canvas=theme.canvas,
        decor=None,
        bg_image=theme.bg_image,
        palette_colors=list(theme.palette),
    )
    style["seriesGradient"] = False
    style["gapPreset"] = "md"
    style["titleStyle"] = {"color": _TITLE_DARK, "fontSize": 13, "fontWeight": 600, "shadow": False}
    style["chartLabelStyle"] = {"color": _LABEL_DARK}
    style["filterChromeStyle"] = {"titleColor": _LABEL_DARK}
    style["widgetStyle"] = {**_DARK_WIDGET}
    return style


def build_gov_dash_style(theme: GovDashTheme) -> dict[str, Any]:
    is_dark = theme.scheme == "dark"
    style = _materialize_dash_style(
        scheme=theme.scheme,
        accent=theme.accent,
        decor=None,
        bg_image=theme.bg_image,
        palette_colors=list(theme.palette),
    )
    style["seriesGradient"] = False
    style["gapPreset"] = "md"
    style["canvasBackground"] = theme.canvas
    style["titleStyle"] = {
        "color": _TITLE_DARK if is_dark else _TITLE_LIGHT,
        "fontSize": 13,
        "fontWeight": 600,
        "shadow": False,
    }
    style["chartLabelStyle"] = {"color": _LABEL_DARK if is_dark else _LABEL_LIGHT}
    style["filterChromeStyle"] = {
        "titleColor": _LABEL_DARK if is_dark else _LABEL_LIGHT,
    }
    style["widgetStyle"] = {**(_DARK_WIDGET if is_dark else _LIGHT_WIDGET)}
    return style


def build_gov_chart_de_style(
    theme: GovScreenTheme | GovDashTheme,
    chart_type: str,
) -> dict[str, Any]:
    colors = list(theme.palette)
    accent = theme.accent
    is_dark = isinstance(theme, GovDashTheme) and theme.scheme == "dark"
    label_color = _LABEL_DARK if is_dark or isinstance(theme, GovScreenTheme) else _LABEL_LIGHT

    de_style: dict[str, Any] = {
        "seriesGradient": False,
        "label": {"show": chart_type not in ("kpi",), "color": label_color, "fontSize": 11},
        "legend": {
            "show": chart_type in ("pie", "bar", "line", "map"),
            "color": label_color,
            "fontSize": 11,
        },
        "border": {"show": False},
        "title": {"color": label_color, "fontSize": 13, "fontWeight": 600},
    }
    if chart_type == "map":
        de_style["geo"] = {
            "mapArea": "china",
            "visualMap": True,
            "areaColor": f"{accent}1a",
            "borderColor": "rgba(148, 163, 184, 0.28)",
        }
    if chart_type in ("bar", "line", "pie", "gauge", "word-cloud", "kpi", "table-info"):
        de_style["paletteId"] = "custom"
        de_style["seriesColor"] = [
            {"name": f"series-{i}", "color": c} for i, c in enumerate(colors[:6])
        ]
    return de_style
