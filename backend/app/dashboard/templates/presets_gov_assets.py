"""gov-enterprise-v1 政企素材包路径（对应 fe/public/template-assets/packs/）。"""

from __future__ import annotations

PACK = "/template-assets/packs/gov-enterprise-v1"


def bg_dark(name: str) -> str:
    return f"{PACK}/backgrounds/dark/{name}.svg"


def bg_light(name: str) -> str:
    return f"{PACK}/backgrounds/light/{name}.svg"


def thumb(name: str) -> str:
    return f"{PACK}/thumbs/{name}.svg"


# 深色大屏：command / header-band 系，纹理克制
SMART_CITY_BG = bg_dark("canvas-dark-slate-command")
SMART_CITY_THUMB = thumb("canvas-dark-slate-command")

DIGITAL_COCKPIT_BG = bg_dark("canvas-dark-indigo-command")
DIGITAL_COCKPIT_THUMB = thumb("canvas-dark-indigo-command")

EMERGENCY_BG = bg_dark("canvas-dark-crimson-command")
EMERGENCY_THUMB = thumb("canvas-dark-crimson-command")

ECO_MONITOR_BG = bg_dark("canvas-dark-emerald-command")
ECO_MONITOR_THUMB = thumb("canvas-dark-emerald-command")

COMMUNITY_BG = bg_dark("canvas-dark-violet-command")
COMMUNITY_THUMB = thumb("canvas-dark-violet-command")

# 浅色看板：header-band / card-float，干净政务报表风
EFFICIENCY_BG = bg_light("canvas-light-cloud-header-band")
EFFICIENCY_THUMB = thumb("canvas-light-cloud-header-band")

SATISFACTION_BG = bg_light("canvas-light-ivory-header-band")
SATISFACTION_THUMB = thumb("canvas-light-ivory-header-band")

FINANCE_BG = bg_light("canvas-light-mint-header-band")
FINANCE_THUMB = thumb("canvas-light-mint-header-band")

INVESTMENT_BG = bg_dark("canvas-dark-royal-command")
INVESTMENT_THUMB = thumb("canvas-dark-royal-command")

GRID_BG = bg_light("canvas-light-paper-header-band")
GRID_THUMB = thumb("canvas-light-paper-header-band")
