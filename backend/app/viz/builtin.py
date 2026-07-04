from __future__ import annotations

from app.viz.registry import ChartTypeAlreadyRegisteredError, registry
from app.viz.specs import ChartTypeSpec, FieldRule

_CAPS = ("style_variant", "field_config", "render_spec")

_BUILTIN_SPECS: tuple[ChartTypeSpec, ...] = (
    ChartTypeSpec("table", "表格", "basic", "table", _CAPS, ("default",), FieldRule(0, 8, 0, 8)),
    ChartTypeSpec("line", "折线图", "basic", "echarts", _CAPS, ("default", "area", "smooth"), FieldRule(1, 8, 1, 8)),
    ChartTypeSpec("bar", "柱状图", "basic", "echarts", _CAPS, ("default", "stacked", "grouped", "horizontal"), FieldRule(1, 8, 1, 8)),
    ChartTypeSpec("pie", "饼图", "basic", "echarts", _CAPS, ("default", "donut"), FieldRule(1, 1, 1, 1)),
    ChartTypeSpec("gauge", "仪表盘", "advanced", "echarts", _CAPS, ("default",), FieldRule(0, 0, 1, 1)),
    ChartTypeSpec("map", "地图", "geo", "echarts", _CAPS, ("default",), FieldRule(1, 1, 1, 1)),
    ChartTypeSpec("sankey", "桑基图", "flow", "echarts", _CAPS, ("default",), FieldRule(2, 2, 1, 1, note="桑基图需 2 个维度（source,target）与 1 个度量")),
    ChartTypeSpec("funnel", "漏斗图", "flow", "echarts", _CAPS, ("default",), FieldRule(1, 1, 1, 1, note="漏斗图需 1 个维度与 1 个度量")),
    ChartTypeSpec("graph", "关系图", "relation", "echarts", _CAPS, ("default",), FieldRule(2, 2, 0, 1, note="关系图需 2 个维度（source,target）")),
)


def register_builtin_chart_types() -> None:
    for spec in _BUILTIN_SPECS:
        if registry.has(spec.type):
            continue
        try:
            registry.register(spec)
        except ChartTypeAlreadyRegisteredError:
            pass
