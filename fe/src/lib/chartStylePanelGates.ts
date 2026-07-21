import type { ChartType } from "@/lib/chartViewConfig";
import {
  isGeoMapChartType,
  isKpiType,
  isMatrixHeatmapChartType,
} from "@/lib/chartViewConfig";
import { isTableLikeChartType } from "@/lib/chartTableInspector";
import {
  chartInspectorCapabilities,
  supportsEmbeddedShellLegend,
} from "@/lib/chartInspectorCapabilities";
import type { ChartStyleSectionId } from "@/lib/chartStyleSectionRegistry";

const DEPTH_VISUAL_CHART_TYPES = new Set<ChartType>([
  "bar",
  "bar-stack",
  "percentage-bar-stack",
  "bar-group",
  "bar-group-stack",
  "bar-horizontal",
  "bar-stack-horizontal",
  "percentage-bar-stack-horizontal",
  "chart-mix",
  "chart-mix-group",
  "chart-mix-stack",
  "heatmap",
  "gauge",
  "stock-line",
  "funnel",
]);

const SERIES_GRADIENT_EXCLUDED = new Set<ChartType>([
  "gauge",
  "liquid",
  "radar",
  "sankey",
  "graph",
  "word-cloud",
  "stock-line",
  "map",
  "map-3d",
  "kpi",
  "t-heatmap",
]);

export type LegendEditorMode = "shell" | "d3" | "none";

export function supportsDepthVisualToggle(chartType: ChartType): boolean {
  return DEPTH_VISUAL_CHART_TYPES.has(chartType);
}

export function supportsSeriesGradientToggle(chartType: ChartType): boolean {
  if (isTableLikeChartType(chartType)) return false;
  if (isMatrixHeatmapChartType(chartType)) return false;
  if (isKpiType(chartType)) return false;
  if (isGeoMapChartType(chartType)) return false;
  return !SERIES_GRADIENT_EXCLUDED.has(chartType);
}

const D3_INLINE_LEGEND_TYPES = new Set<ChartType>([
  "pie",
  "pie-donut",
  "pie-rose",
  "pie-donut-rose",
  "waterfall",
  "bidirectional-bar",
  "funnel",
]);

export function resolveLegendEditorMode(chartType: ChartType): LegendEditorMode {
  const caps = chartInspectorCapabilities(chartType);
  if (!caps.legend) return "none";
  if (D3_INLINE_LEGEND_TYPES.has(chartType)) return "d3";
  if (supportsEmbeddedShellLegend(chartType)) return "shell";
  return "d3";
}

/** 按图表能力过滤样式 Tab 分区，避免展示不可用的配置项 */
export function filterStyleSectionsForChart(
  chartType: ChartType,
  sections: ChartStyleSectionId[],
): ChartStyleSectionId[] {
  const caps = chartInspectorCapabilities(chartType);
  return sections.filter((id) => {
    if (id === "legend") return caps.legend;
    if (id === "label") return caps.label || caps.labelFormat;
    if (id === "remark") return caps.remark;
    return true;
  });
}
