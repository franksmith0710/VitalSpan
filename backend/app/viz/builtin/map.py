from __future__ import annotations

from app.viz.builtin._helpers import HEATMAP_MATRIX, MAP_RULE, antv

MAP_SPECS = (
    antv("map", "区域地图", "map", library="g2", field_rule=MAP_RULE),
    antv(
        "heatmap",
        "热力图（已弃用）",
        "map",
        field_rule=HEATMAP_MATRIX,
        deprecated=True,
        migrates_to="t-heatmap",
    ),
)
