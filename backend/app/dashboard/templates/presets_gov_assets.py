"""gov-enterprise-v1 + de-dashboard-v1 模板素材包路径。"""

from __future__ import annotations

PACK = "/template-assets/packs/gov-enterprise-v1"
DE_PACK = "/template-assets/packs/de-dashboard-v1"


def bg_light(name: str) -> str:
    return f"{PACK}/backgrounds/light/{name}.svg"


def bg_dark(name: str) -> str:
    return f"{PACK}/backgrounds/dark/{name}.svg"


def thumb(name: str) -> str:
    return f"{PACK}/thumbs/{name}.svg"


def de_bg(slug: str) -> str:
    return f"{DE_PACK}/backgrounds/{slug}.svg"


def de_thumb(slug: str) -> str:
    return f"{DE_PACK}/thumbs/{slug}.svg"


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

# —— 仪表板：DataEase 风格 de-dashboard-v1 包 ——
EFFICIENCY_BG = de_bg("gov-efficiency")
EFFICIENCY_THUMB = de_thumb("gov-efficiency")

SATISFACTION_BG = de_bg("gov-satisfaction")
SATISFACTION_THUMB = de_thumb("gov-satisfaction")

FINANCE_BG = de_bg("gov-finance")
FINANCE_THUMB = de_thumb("gov-finance")

INVESTMENT_BG = de_bg("gov-investment")
INVESTMENT_THUMB = de_thumb("gov-investment")

GRID_BG = de_bg("gov-grid")
GRID_THUMB = de_thumb("gov-grid")

# —— 通用内置大屏 / 看板（presets.py 引用）——
SCREEN_COMMAND_BG = bg_dark("canvas-dark-cyan-aurora")
SCREEN_TECH_BG = bg_dark("canvas-dark-royal-hud-scan")
SCREEN_GOV_BG = bg_dark("canvas-dark-indigo-honeycomb")
SCREEN_SALES_GEO_BG = bg_dark("canvas-dark-emerald-aurora")

DASH_DUAL_KPI_BG = de_bg("dash-dual-kpi")
DASH_TRIPLE_BG = de_bg("dash-triple")
DASH_OPS_BG = de_bg("dash-ops")
DASH_BLANK_BG = de_bg("dash-blank")
