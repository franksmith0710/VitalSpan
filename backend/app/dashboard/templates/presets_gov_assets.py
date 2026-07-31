"""gov-enterprise-v1 政企素材包路径（对应 fe/public/template-assets/packs/）。"""

from __future__ import annotations

PACK = "/template-assets/packs/gov-enterprise-v1"


def bg_light(name: str) -> str:
    return f"{PACK}/backgrounds/light/{name}.svg"


def thumb(name: str) -> str:
    return f"{PACK}/thumbs/{name}.svg"


# 全部使用浅色 clean-header：顶栏细线 + 无装饰纹理（整齐政务风）
SMART_CITY_BG = bg_light("canvas-light-frost-clean-header")
SMART_CITY_THUMB = thumb("canvas-light-frost-clean-header")

DIGITAL_COCKPIT_BG = bg_light("canvas-light-paper-clean-header")
DIGITAL_COCKPIT_THUMB = thumb("canvas-light-paper-clean-header")

EMERGENCY_BG = bg_light("canvas-light-rose-clean-header")
EMERGENCY_THUMB = thumb("canvas-light-rose-clean-header")

ECO_MONITOR_BG = bg_light("canvas-light-mint-clean-header")
ECO_MONITOR_THUMB = thumb("canvas-light-mint-clean-header")

COMMUNITY_BG = bg_light("canvas-light-lavender-clean-header")
COMMUNITY_THUMB = thumb("canvas-light-lavender-clean-header")

EFFICIENCY_BG = bg_light("canvas-light-cloud-clean-header")
EFFICIENCY_THUMB = thumb("canvas-light-cloud-clean-header")

SATISFACTION_BG = bg_light("canvas-light-ivory-clean-header")
SATISFACTION_THUMB = thumb("canvas-light-ivory-clean-header")

FINANCE_BG = bg_light("canvas-light-mint-clean-header")
FINANCE_THUMB = thumb("canvas-light-mint-clean-header")

INVESTMENT_BG = bg_light("canvas-light-paper-clean-header")
INVESTMENT_THUMB = thumb("canvas-light-paper-clean-header")

GRID_BG = bg_light("canvas-light-cloud-clean-header")
GRID_THUMB = thumb("canvas-light-cloud-clean-header")
