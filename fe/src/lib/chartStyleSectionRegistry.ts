import type { ChartType } from "@/lib/chartViewConfig";
import { isKpiType } from "@/lib/chartViewConfig";
import { getChartPlugin } from "@/components/charts/engine/plugins/registry";
import { tableInspectorProfile, tableStyleSectionsForType } from "@/lib/chartTableInspector";

/** 样式 Tab 折叠块 ID（按图表类型组合，对标 DataEase attr-style） */
export type ChartStyleSectionId =
  | "tableBasic"
  | "tableColor"
  | "variantBasic"
  | "palette"
  | "geo"
  | "title"
  | "remark"
  | "legend"
  | "label"
  | "background";

export const STYLE_VARIANT_LABELS: Record<string, string> = {
  default: "默认",
  area: "面积",
  smooth: "平滑",
  stacked: "堆叠",
  grouped: "分组",
  horizontal: "横向",
  donut: "环形",
  rose: "玫瑰",
  progress: "进度",
  pyramid: "金字塔",
  force: "力导向",
  dagre: "层次",
  bubble: "气泡",
};

const TABLE_SECTIONS: ChartStyleSectionId[] = [
  "tableBasic",
  "palette",
  "title",
  "background",
];

const LINE_BAR_SECTIONS: ChartStyleSectionId[] = [
  "background",
  "palette",
  "title",
  "remark",
  "legend",
  "label",
];

const PIE_SECTIONS: ChartStyleSectionId[] = LINE_BAR_SECTIONS;
const GEO_MAP_SECTIONS: ChartStyleSectionId[] = ["background", "palette", "geo", "title", "remark"];
const KPI_SECTIONS: ChartStyleSectionId[] = ["background", "palette", "title", "label"];
const MINIMAL_SECTIONS: ChartStyleSectionId[] = ["background", "palette", "title"];

/** 返回当前图表类型应展示的样式折叠块（读 plugin / 表格 profile） */
export function chartStyleSectionsForType(chartType: ChartType): ChartStyleSectionId[] {
  const tableSections = tableStyleSectionsForType(chartType);
  if (tableSections.length > 0) return tableSections;

  const plugin = getChartPlugin(chartType);
  if (plugin?.properties?.length) return plugin.properties;

  if (chartType === "table") return TABLE_SECTIONS;
  if (chartType === "pie") return PIE_SECTIONS;
  if (chartType === "map" || chartType === "map-3d") return GEO_MAP_SECTIONS;
  if (chartType === "heatmap" || chartType === "t-heatmap") return MINIMAL_SECTIONS;
  if (isKpiType(chartType)) return KPI_SECTIONS;
  if (chartType === "funnel" || chartType === "sankey" || chartType === "graph") {
    return MINIMAL_SECTIONS;
  }
  return LINE_BAR_SECTIONS;
}

export function styleVariantLabel(variant: string): string {
  return STYLE_VARIANT_LABELS[variant] ?? variant;
}
