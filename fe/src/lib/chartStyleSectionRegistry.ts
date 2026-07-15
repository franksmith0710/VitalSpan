import type { ChartType } from "@/lib/chartViewConfig";
import { isKpiType, isLineOrBarType } from "@/lib/chartViewConfig";

/** 样式 Tab 折叠块 ID（按图表类型组合，对标 DataEase attr-style） */
export type ChartStyleSectionId =
  | "tableBasic"
  | "variantBasic"
  | "palette"
  | "geo"
  | "title"
  | "remark"
  | "legend"
  | "label"
  | "background"
  | "border";

export const STYLE_VARIANT_LABELS: Record<string, string> = {
  default: "默认",
  area: "面积",
  smooth: "平滑",
  stacked: "堆叠",
  grouped: "分组",
  horizontal: "横向",
  donut: "环形",
};

const TABLE_SECTIONS: ChartStyleSectionId[] = [
  "tableBasic",
  "title",
  "background",
  "border",
];

const LINE_BAR_SECTIONS: ChartStyleSectionId[] = [
  "variantBasic",
  "palette",
  "title",
  "remark",
  "legend",
  "label",
  "background",
  "border",
];

const PIE_SECTIONS: ChartStyleSectionId[] = [
  "variantBasic",
  "palette",
  "title",
  "remark",
  "legend",
  "label",
  "background",
  "border",
];

const GEO_MAP_SECTIONS: ChartStyleSectionId[] = [
  "palette",
  "geo",
  "title",
  "remark",
  "background",
  "border",
];

const GEO_HEATMAP_SECTIONS: ChartStyleSectionId[] = [
  "palette",
  "geo",
  "title",
  "background",
  "border",
];

const KPI_SECTIONS: ChartStyleSectionId[] = ["palette", "title", "label", "background", "border"];

const FLOW_RELATION_SECTIONS: ChartStyleSectionId[] = [
  "palette",
  "title",
  "remark",
  "legend",
  "background",
  "border",
];

const MINIMAL_SECTIONS: ChartStyleSectionId[] = ["palette", "title", "background", "border"];

/** 返回当前图表类型应展示的样式折叠块（顺序对标 DataEase） */
export function chartStyleSectionsForType(chartType: ChartType): ChartStyleSectionId[] {
  if (chartType === "table") return TABLE_SECTIONS;
  if (isLineOrBarType(chartType)) return LINE_BAR_SECTIONS;
  if (chartType === "pie") return PIE_SECTIONS;
  if (chartType === "map") return GEO_MAP_SECTIONS;
  if (chartType === "heatmap") return GEO_HEATMAP_SECTIONS;
  if (isKpiType(chartType)) return KPI_SECTIONS;
  if (chartType === "funnel" || chartType === "sankey" || chartType === "graph") {
    return FLOW_RELATION_SECTIONS;
  }
  if (chartType === "timeline" || chartType === "gauge") return MINIMAL_SECTIONS;
  return MINIMAL_SECTIONS;
}

export function styleVariantLabel(variant: string): string {
  return STYLE_VARIANT_LABELS[variant] ?? variant;
}
