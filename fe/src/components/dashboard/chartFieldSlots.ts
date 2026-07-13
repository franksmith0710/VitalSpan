import type { ChartType } from "@/lib/chartViewConfig";

export type ChartFieldSlotHints = {
  dimensionLabel: string;
  metricLabel: string;
};

/** 图表类型 → 轴槽位文案（对标 DataEase chart-edit，M1 仍用 Select 填入） */
export function chartFieldSlotHints(chartType: ChartType | string): ChartFieldSlotHints {
  switch (chartType) {
    case "bar":
    case "line":
    case "timeline":
      return { dimensionLabel: "类别轴 / 维度", metricLabel: "值轴 / 指标" };
    case "pie":
    case "funnel":
      return { dimensionLabel: "扇区 / 维度", metricLabel: "数值 / 指标" };
    case "table":
      return { dimensionLabel: "列 / 维度", metricLabel: "数值列 / 指标" };
    case "kpi":
    case "gauge":
      return { dimensionLabel: "分组 / 维度（可选）", metricLabel: "指标 / 度量" };
    case "map":
    case "heatmap":
      return { dimensionLabel: "地理 / 维度", metricLabel: "数值 / 指标" };
    case "sankey":
    case "graph":
      return { dimensionLabel: "节点 / 维度", metricLabel: "边权 / 指标" };
    default:
      return { dimensionLabel: "维度字段", metricLabel: "度量字段" };
  }
}
