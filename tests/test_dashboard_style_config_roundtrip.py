"""Dashboard styleConfig FE↔BE roundtrip: no silent field strip."""

from app.dashboard.schemas import DashboardStyleConfig
from app.views.validate import validate_layout_dict


def test_number_format_auto_and_thousand_separator_roundtrip() -> None:
    cfg = DashboardStyleConfig.model_validate(
        {
            "numberFormat": {
                "type": "auto",
                "decimals": 2,
                "thousandSeparator": False,
            }
        }
    )
    dumped = cfg.model_dump(by_alias=True, exclude_none=True)
    assert dumped["numberFormat"]["type"] == "auto"
    assert dumped["numberFormat"]["thousandSeparator"] is False


def test_style_config_preserves_fe_dashboard_fields() -> None:
    payload = {
        "chrome": {
            "showChartLoadingHint": False,
            "showFloatingActions": True,
            "showChartActionButtons": False,
            "showAuxiliaryGrid": True,
        },
        "dialogStyle": {"background": "#111827", "fontColor": "#f8fafc"},
        "canvasDecorPresetId": "dots-soft",
        "paletteOpacity": 0.85,
        "seriesGradient": True,
        "depthVisual": "standard",
        "chartLabelShow": True,
        "chartLabelStyle": {"fontSize": 12, "color": "#334155"},
        "tooltipShow": False,
        "chartTooltipStyle": {
            "fontSize": 11,
            "color": "#e2e8f0",
            "background": "rgba(15,23,42,0.92)",
        },
        "tableColorStyle": {"headerBg": "#1e293b", "zebraBg": "rgba(148,163,184,0.12)"},
        "widgetStyle": {
            "background": "linear-gradient(180deg,#0f172a,#1e293b)",
            "backgroundImage": "https://example.com/bg.png",
            "backgroundShow": True,
            "backgroundMode": "image",
            "padding": 12,
            "paddingTop": 8,
            "borderEnabled": False,
            "framePresetId": "frame-3",
            "frameColor": "#38bdf8",
            "frameOpacity": 0.7,
        },
        "titleStyle": {
            "show": True,
            "fontSize": 16,
            "shadow": True,
            "fontStyle": "italic",
            "color": "#f8fafc",
        },
        "themeVariants": {
            "light": {
                "canvasBackground": "#ffffff",
                "canvasDecorPresetId": "grid-light",
                "themeAccent": "#2563eb",
                "dialogStyle": {"background": "#fff", "fontColor": "#111"},
                "widgetStyle": {
                    "background": "#fff",
                    "borderColor": "#e2e8f0",
                    "borderEnabled": True,
                },
            },
            "dark": {
                "canvasBackground": "#0f172a",
                "themeAccent": "#38bdf8",
            },
        },
        "colorScheme": "dark",
        "gapPreset": "none",
        "widgetGap": 0,
        "pixelGutter": 0,
    }
    cfg = DashboardStyleConfig.model_validate(payload)
    dumped = cfg.model_dump(by_alias=True, exclude_none=True)

    assert dumped["chrome"]["showAuxiliaryGrid"] is True
    assert dumped["dialogStyle"]["fontColor"] == "#f8fafc"
    assert dumped["canvasDecorPresetId"] == "dots-soft"
    assert dumped["paletteOpacity"] == 0.85
    assert dumped["seriesGradient"] is True
    assert dumped["depthVisual"] == "standard"
    assert dumped["chartLabelShow"] is True
    assert dumped["tooltipShow"] is False
    assert dumped["tableColorStyle"]["headerBg"] == "#1e293b"
    assert dumped["widgetStyle"]["padding"] == 12
    assert dumped["widgetStyle"]["borderEnabled"] is False
    assert dumped["widgetStyle"]["backgroundImage"] == "https://example.com/bg.png"
    assert dumped["titleStyle"]["shadow"] is True
    assert dumped["themeVariants"]["light"]["canvasDecorPresetId"] == "grid-light"
    assert dumped["themeVariants"]["light"]["themeAccent"] == "#2563eb"
    assert dumped["themeVariants"]["light"]["dialogStyle"]["fontColor"] == "#111"


def test_validate_layout_dict_keeps_rich_style_config() -> None:
    layout = {
        "version": 2,
        "canvas": {"width": 1440, "height": 900},
        "widgets": [],
        "globalFilters": [],
        "styleConfig": {
            "surfaceKind": "dashboard",
            "numberFormat": {"type": "auto", "thousandSeparator": True},
            "chrome": {"showFloatingActions": False},
            "widgetStyle": {"padding": 10, "borderEnabled": True},
            "gapPreset": "sm",
        },
    }
    validated = validate_layout_dict(layout)
    style = validated["styleConfig"]
    assert style["numberFormat"]["type"] == "auto"
    assert style["numberFormat"]["thousandSeparator"] is True
    assert style["chrome"]["showFloatingActions"] is False
    assert style["widgetStyle"]["padding"] == 10
    assert style["widgetStyle"]["borderEnabled"] is True
