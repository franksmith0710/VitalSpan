"""gov-enterprise-v1 政企素材包路径（对应 fe/public/template-assets/packs/）。"""

from __future__ import annotations

PACK = "/template-assets/packs/gov-enterprise-v1"


def bg_light(name: str) -> str:
    return f"{PACK}/backgrounds/light/{name}.svg"


def bg_dark(name: str) -> str:
    return f"{PACK}/backgrounds/dark/{name}.svg"


def thumb(name: str) -> str:
    return f"{PACK}/thumbs/{name}.svg"


# —— 数据大屏：每套独立底图纹理 ——
SMART_CITY_BG = bg_dark("canvas-dark-cyan-hud-scan")
SMART_CITY_THUMB = thumb("canvas-dark-cyan-hud-scan")

DIGITAL_COCKPIT_BG = bg_light("canvas-light-paper-watermark")
DIGITAL_COCKPIT_THUMB = thumb("canvas-light-paper-watermark")

EMERGENCY_BG = bg_dark("canvas-dark-crimson-command")
EMERGENCY_THUMB = thumb("canvas-dark-crimson-command")

ECO_MONITOR_BG = bg_light("canvas-light-mint-ribbon")
ECO_MONITOR_THUMB = thumb("canvas-light-mint-ribbon")

COMMUNITY_BG = bg_light("canvas-light-lavender-card-float")
COMMUNITY_THUMB = thumb("canvas-light-lavender-card-float")

# —— 仪表板：浅色卡片浮层 / 水印 / 点阵 ——
EFFICIENCY_BG = bg_light("canvas-light-cloud-dot-matrix")
EFFICIENCY_THUMB = thumb("canvas-light-cloud-dot-matrix")

SATISFACTION_BG = bg_light("canvas-light-lavender-watermark")
SATISFACTION_THUMB = thumb("canvas-light-lavender-watermark")

FINANCE_BG = bg_light("canvas-light-mint-corner-fold")
FINANCE_THUMB = thumb("canvas-light-mint-corner-fold")

INVESTMENT_BG = bg_light("canvas-light-paper-header-band")
INVESTMENT_THUMB = thumb("canvas-light-paper-header-band")

GRID_BG = bg_light("canvas-light-ivory-dot-matrix")
GRID_THUMB = thumb("canvas-light-ivory-dot-matrix")

# —— 通用内置大屏 / 看板（presets.py 引用）——
SCREEN_COMMAND_BG = bg_dark("canvas-dark-cyan-aurora")
SCREEN_TECH_BG = bg_dark("canvas-dark-royal-hud-scan")
SCREEN_GOV_BG = bg_dark("canvas-dark-indigo-honeycomb")
SCREEN_SALES_GEO_BG = bg_dark("canvas-dark-emerald-aurora")

DASH_DUAL_KPI_BG = bg_light("canvas-light-frost-card-float")
DASH_TRIPLE_BG = bg_light("canvas-light-lavender-ribbon")
DASH_OPS_BG = bg_light("canvas-light-cloud-watermark")
DASH_BLANK_BG = bg_light("canvas-light-frost-dot-matrix")
