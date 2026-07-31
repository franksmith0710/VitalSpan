"""gov-enterprise-v1 政企素材包路径（对应 fe/public/template-assets/packs/）。"""

from __future__ import annotations

PACK = "/template-assets/packs/gov-enterprise-v1"


def bg_dark(name: str) -> str:
    return f"{PACK}/backgrounds/dark/{name}.svg"


def bg_light(name: str) -> str:
    return f"{PACK}/backgrounds/light/{name}.svg"


def thumb(name: str) -> str:
    return f"{PACK}/thumbs/{name}.svg"


# —— 数据大屏：深色 canvas + 缩略图 ——
SMART_CITY_BG = bg_dark("canvas-dark-cyan-command")
SMART_CITY_THUMB = thumb("canvas-dark-cyan-command")

DIGITAL_COCKPIT_BG = bg_dark("canvas-dark-indigo-hud-scan")
DIGITAL_COCKPIT_THUMB = thumb("canvas-dark-indigo-hud-scan")

EMERGENCY_BG = bg_dark("canvas-dark-crimson-aurora")
EMERGENCY_THUMB = thumb("canvas-dark-crimson-aurora")

ECO_MONITOR_BG = bg_dark("canvas-dark-emerald-circuit")
ECO_MONITOR_THUMB = thumb("canvas-dark-emerald-circuit")

COMMUNITY_BG = bg_dark("canvas-dark-violet-honeycomb")
COMMUNITY_THUMB = thumb("canvas-dark-violet-honeycomb")

# —— 仪表板：浅色 canvas + 缩略图 ——
EFFICIENCY_BG = bg_light("canvas-light-cloud-header-band")
EFFICIENCY_THUMB = thumb("canvas-light-cloud-header-band")

SATISFACTION_BG = bg_light("canvas-light-lavender-card-float")
SATISFACTION_THUMB = thumb("canvas-light-lavender-card-float")

FINANCE_BG = bg_light("canvas-light-mint-ribbon")
FINANCE_THUMB = thumb("canvas-light-mint-ribbon")

INVESTMENT_BG = bg_dark("canvas-dark-royal-command")
INVESTMENT_THUMB = thumb("canvas-dark-royal-command")

GRID_BG = bg_light("canvas-light-paper-watermark")
GRID_THUMB = thumb("canvas-light-paper-watermark")
