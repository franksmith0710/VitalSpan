import type { ChartType } from "@/lib/chartViewConfig";

export type ChartFieldSlotHints = {
  dimensionLabel: string;
  metricLabel: string;
};

export type ChartDataSlotBlueprint = {
  kind: "dimension" | "metric";
  index: number;
  label: string;
  /** 指标槽展示聚合后缀，如 (求和) */
  showAggregation?: boolean;
};

/** 图表类型 → 轴槽位文案（兼容旧调用） */
export function chartFieldSlotHints(chartType: ChartType | string): ChartFieldSlotHints {
  const slots = chartDataSlotBlueprint(chartType);
  const firstDim = slots.find((s) => s.kind === "dimension");
  const firstMet = slots.find((s) => s.kind === "metric");
  return {
    dimensionLabel: firstDim?.label ?? "维度字段",
    metricLabel: firstMet?.label ?? "度量字段",
  };
}

/** DataEase chart-edit：按图表类型固定槽位（空槽也展示「拖动字段至此处」） */
export function chartDataSlotBlueprint(chartType: ChartType | string): ChartDataSlotBlueprint[] {
  switch (chartType) {
    case "bar":
    case "line":
    case "timeline":
      return [
        { kind: "dimension", index: 0, label: "类别轴 / 维度" },
        { kind: "dimension", index: 1, label: "子类别 / 维度" },
        { kind: "metric", index: 0, label: "值轴 / 指标", showAggregation: true },
        { kind: "dimension", index: 2, label: "钻取 / 维度" },
      ];
    case "pie":
    case "funnel":
      return [
        { kind: "dimension", index: 0, label: "扇区 / 维度" },
        { kind: "metric", index: 0, label: "数值 / 指标", showAggregation: true },
      ];
    case "table":
      return [
        { kind: "dimension", index: 0, label: "列 / 维度" },
        { kind: "metric", index: 0, label: "数值列 / 指标", showAggregation: true },
      ];
    case "kpi":
    case "gauge":
      return [
        { kind: "dimension", index: 0, label: "分组 / 维度" },
        { kind: "metric", index: 0, label: "指标 / 度量", showAggregation: true },
      ];
    case "map":
    case "heatmap":
      return [
        { kind: "dimension", index: 0, label: "地理 / 维度" },
        { kind: "metric", index: 0, label: "数值 / 指标", showAggregation: true },
      ];
    case "sankey":
    case "graph":
      return [
        { kind: "dimension", index: 0, label: "节点 / 维度" },
        { kind: "metric", index: 0, label: "边权 / 指标", showAggregation: true },
      ];
    default:
      return [
        { kind: "dimension", index: 0, label: "维度字段" },
        { kind: "metric", index: 0, label: "度量字段", showAggregation: true },
      ];
  }
}
