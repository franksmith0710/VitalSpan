import type { ChartType, ChartViewConfig } from "@/lib/chartViewConfig";
import { resolveChartFieldRule } from "@/lib/chartFieldRules";
import { getChartPlugin } from "@/components/charts/engine/plugins/registry";

export type ChartFieldSlotHints = {
  dimensionLabel: string;
  metricLabel: string;
};

export type ChartDataSlotBlueprint = {
  kind: "dimension" | "metric";
  index: number;
  label: string;
  /** false = 对标 DE 可选槽（子类别/钻取/分组等），不参与 renderReady 必填判定 */
  required?: boolean;
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
  const plugin = getChartPlugin(chartType);
  if (plugin) {
    switch (plugin.paletteCategory) {
      case "trend":
        return [
          { kind: "dimension", index: 0, label: "类别轴 / 维度", required: true },
          { kind: "dimension", index: 1, label: "子类别 / 维度", required: false },
          { kind: "metric", index: 0, label: "值轴 / 指标", required: true, showAggregation: true },
          { kind: "dimension", index: 2, label: "钻取 / 维度", required: false },
        ];
      case "compare":
        if (chartType === "bar-range") {
          return [
            { kind: "dimension", index: 0, label: "类别 / 维度", required: true },
            { kind: "metric", index: 0, label: "下限 / 指标", required: true, showAggregation: true },
            { kind: "metric", index: 1, label: "上限 / 指标", required: true, showAggregation: true },
          ];
        }
        if (chartType === "progress-bar") {
          return [
            { kind: "dimension", index: 0, label: "类别 / 维度", required: true },
            { kind: "metric", index: 0, label: "进度值 / 指标", required: true, showAggregation: true },
          ];
        }
        if (chartType === "stock-line") {
          return [
            { kind: "dimension", index: 0, label: "日期 / 维度", required: true },
            { kind: "metric", index: 0, label: "开盘价", required: true, showAggregation: true },
            { kind: "metric", index: 1, label: "收盘价", required: true, showAggregation: true },
            { kind: "metric", index: 2, label: "最低价", required: true, showAggregation: true },
            { kind: "metric", index: 3, label: "最高价", required: true, showAggregation: true },
          ];
        }
        if (chartType === "bullet-graph") {
          return [
            { kind: "dimension", index: 0, label: "类别 / 维度", required: false },
            { kind: "metric", index: 0, label: "实际值 / 指标", required: true, showAggregation: true },
            { kind: "metric", index: 1, label: "目标值 / 指标", required: false, showAggregation: true },
            { kind: "metric", index: 2, label: "区间上限 / 指标", required: false, showAggregation: true },
          ];
        }
        if (chartType === "waterfall" || chartType === "bidirectional-bar") {
          return [
            { kind: "dimension", index: 0, label: "类别 / 维度", required: true },
            { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
          ];
        }
        return [
          { kind: "dimension", index: 0, label: "类别轴 / 维度", required: true },
          { kind: "dimension", index: 1, label: "子类别 / 维度", required: false },
          { kind: "metric", index: 0, label: "值轴 / 指标", required: true, showAggregation: true },
          { kind: "dimension", index: 2, label: "钻取 / 维度", required: false },
        ];
      case "dual_axes": {
        const subLabel =
          chartType === "chart-mix-stack"
            ? "堆叠项 / 维度"
            : chartType === "chart-mix-group"
              ? "分组项 / 维度"
              : "子类别 / 维度";
        return [
          { kind: "dimension", index: 0, label: "类别轴 / 维度", required: true },
          { kind: "dimension", index: 1, label: subLabel, required: false },
          { kind: "metric", index: 0, label: "左值轴 / 柱指标", required: true, showAggregation: true },
          { kind: "metric", index: 1, label: "右值轴 / 线指标", required: true, showAggregation: true },
          { kind: "dimension", index: 2, label: "钻取 / 维度", required: false },
        ];
      }
      case "distribute":
        return [
          { kind: "dimension", index: 0, label: "扇区 / 维度", required: true },
          { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
        ];
      case "table":
        if (chartType === "table-pivot") {
          return [
            { kind: "dimension", index: 0, label: "行 / 维度", required: true },
            { kind: "dimension", index: 1, label: "列 / 维度", required: true },
            { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
          ];
        }
        if (chartType === "table-normal") {
          return [
            { kind: "dimension", index: 0, label: "分组 / 维度", required: true },
            { kind: "metric", index: 0, label: "汇总 / 指标", required: true, showAggregation: true },
          ];
        }
        if (chartType === "t-heatmap") {
          return [
            { kind: "dimension", index: 0, label: "横轴 / 维度", required: true },
            { kind: "dimension", index: 1, label: "纵轴 / 维度", required: true },
            { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
          ];
        }
        return [
          { kind: "dimension", index: 0, label: "列 / 维度", required: false },
          { kind: "metric", index: 0, label: "数值列 / 指标", required: false, showAggregation: true },
        ];
      case "quota":
        if (chartType === "kpi") {
          return [
            { kind: "dimension", index: 0, label: "分组 / 维度", required: false },
            { kind: "metric", index: 0, label: "指标 / 度量", required: true, showAggregation: true },
          ];
        }
        return [{ kind: "metric", index: 0, label: "指标 / 度量", required: true, showAggregation: true }];
      case "map":
        return [
          { kind: "dimension", index: 0, label: "地区 / 维度", required: true },
          { kind: "metric", index: 0, label: "数据 / 指标", required: true, showAggregation: true },
          { kind: "dimension", index: 1, label: "钻取 / 维度", required: false },
        ];
      case "relation":
        if (chartType === "sankey") {
          return [
            { kind: "dimension", index: 0, label: "起始 / 维度", required: true },
            { kind: "dimension", index: 1, label: "终点 / 维度", required: true },
            { kind: "metric", index: 0, label: "边权 / 指标", required: true, showAggregation: true },
          ];
        }
        if (chartType === "graph") {
          return [
            { kind: "dimension", index: 0, label: "起点 / 维度", required: true },
            { kind: "dimension", index: 1, label: "终点 / 维度", required: true },
            { kind: "metric", index: 0, label: "关系 / 指标", required: false, showAggregation: true },
          ];
        }
        if (chartType === "scatter" || chartType === "quadrant" || chartType === "multi-scatter") {
          return [
            { kind: "dimension", index: 0, label: "系列 / 维度", required: true },
            { kind: "metric", index: 0, label: "X 轴 / 指标", required: true, showAggregation: true },
            { kind: "metric", index: 1, label: "Y 轴 / 指标", required: true, showAggregation: true },
          ];
        }
        return [
          { kind: "dimension", index: 0, label: "类别 / 维度", required: true },
          { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
        ];
      default:
        break;
    }
  }

  switch (chartType) {
    case "bar":
    case "line":
    case "timeline":
      return [
        { kind: "dimension", index: 0, label: "类别轴 / 维度", required: true },
        { kind: "dimension", index: 1, label: "子类别 / 维度", required: false },
        { kind: "metric", index: 0, label: "值轴 / 指标", required: true, showAggregation: true },
        { kind: "dimension", index: 2, label: "钻取 / 维度", required: false },
      ];
    case "pie":
    case "funnel":
      return [
        { kind: "dimension", index: 0, label: "扇区 / 维度", required: true },
        { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
      ];
    case "table":
      return [
        { kind: "dimension", index: 0, label: "列 / 维度", required: false },
        { kind: "metric", index: 0, label: "数值列 / 指标", required: false, showAggregation: true },
      ];
    case "kpi":
      return [
        { kind: "dimension", index: 0, label: "分组 / 维度", required: false },
        { kind: "metric", index: 0, label: "指标 / 度量", required: true, showAggregation: true },
      ];
    case "gauge":
    case "liquid":
      return [{ kind: "metric", index: 0, label: "指标 / 度量", required: true, showAggregation: true }];
    case "map":
      return [
        { kind: "dimension", index: 0, label: "地区 / 维度", required: true },
        { kind: "metric", index: 0, label: "数据 / 指标", required: true, showAggregation: true },
        { kind: "dimension", index: 1, label: "钻取 / 维度", required: false },
      ];
    case "heatmap":
      return [
        { kind: "dimension", index: 0, label: "横轴 / 维度", required: true },
        { kind: "dimension", index: 1, label: "纵轴 / 维度", required: true },
        { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
      ];
    case "sankey":
      return [
        { kind: "dimension", index: 0, label: "起始 / 维度", required: true },
        { kind: "dimension", index: 1, label: "终点 / 维度", required: true },
        { kind: "metric", index: 0, label: "边权 / 指标", required: true, showAggregation: true },
      ];
    case "graph":
      return [
        { kind: "dimension", index: 0, label: "起点 / 维度", required: true },
        { kind: "dimension", index: 1, label: "终点 / 维度", required: true },
        { kind: "metric", index: 0, label: "关系 / 指标", required: false, showAggregation: true },
      ];
    case "scatter":
    case "quadrant":
    case "multi-scatter":
      return [
        { kind: "dimension", index: 0, label: "系列 / 维度", required: true },
        { kind: "metric", index: 0, label: "X 轴 / 指标", required: true, showAggregation: true },
        { kind: "metric", index: 1, label: "Y 轴 / 指标", required: true, showAggregation: true },
      ];
    case "combo":
      return [
        { kind: "dimension", index: 0, label: "类别轴 / 维度", required: true },
        { kind: "metric", index: 0, label: "柱指标", required: true, showAggregation: true },
        { kind: "metric", index: 1, label: "线指标", required: true, showAggregation: true },
      ];
    case "waterfall":
    case "bidirectional-bar":
      return [
        { kind: "dimension", index: 0, label: "类别 / 维度", required: true },
        { kind: "metric", index: 0, label: "数值 / 指标", required: true, showAggregation: true },
      ];
    case "bar-range":
      return [
        { kind: "dimension", index: 0, label: "类别 / 维度", required: true },
        { kind: "metric", index: 0, label: "下限 / 指标", required: true, showAggregation: true },
        { kind: "metric", index: 1, label: "上限 / 指标", required: true, showAggregation: true },
      ];
    case "progress-bar":
      return [
        { kind: "dimension", index: 0, label: "类别 / 维度", required: true },
        { kind: "metric", index: 0, label: "进度值 / 指标", required: true, showAggregation: true },
      ];
    case "bullet-graph":
      return [
        { kind: "dimension", index: 0, label: "类别 / 维度", required: false },
        { kind: "metric", index: 0, label: "实际值 / 指标", required: true, showAggregation: true },
        { kind: "metric", index: 1, label: "目标值 / 指标", required: false, showAggregation: true },
        { kind: "metric", index: 2, label: "区间上限 / 指标", required: false, showAggregation: true },
      ];
    case "stock-line":
      return [
        { kind: "dimension", index: 0, label: "日期 / 维度", required: true },
        { kind: "metric", index: 0, label: "开盘价", required: true, showAggregation: true },
        { kind: "metric", index: 1, label: "收盘价", required: true, showAggregation: true },
        { kind: "metric", index: 2, label: "最低价", required: true, showAggregation: true },
        { kind: "metric", index: 3, label: "最高价", required: true, showAggregation: true },
      ];
    default:
      return [
        { kind: "dimension", index: 0, label: "维度字段" },
        { kind: "metric", index: 0, label: "度量字段", showAggregation: true },
      ];
  }
}

/** @deprecated 使用 chartRenderRequiredCounts；保留仅用于旧测试 */
export function chartMinFieldCounts(chartType: ChartType | string): {
  minDimensions: number;
  minMetrics: number;
} {
  return chartRenderRequiredCounts(chartType);
}

/** 渲染/校验所需最少已填字段（对标 DE 必填槽 + backend field_rule） */
export function chartRenderRequiredCounts(chartType: ChartType | string): {
  minDimensions: number;
  minMetrics: number;
} {
  const rule = resolveChartFieldRule(chartType);
  const slots = chartDataSlotBlueprint(chartType);
  let requiredDims = 0;
  let requiredMetrics = 0;
  for (const slot of slots) {
    if (slot.required === false) continue;
    if (slot.kind === "dimension") {
      requiredDims = Math.max(requiredDims, slot.index + 1);
    } else {
      requiredMetrics = Math.max(requiredMetrics, slot.index + 1);
    }
  }
  return {
    minDimensions: Math.max(requiredDims, rule.minDimensions),
    minMetrics: Math.max(requiredMetrics, rule.minMetrics),
  };
}

/** 切换图表类型时补齐/裁剪槽位，避免超出类型字段规则 */
export function ensureChartSlotCapacity(cfg: ChartViewConfig): ChartViewConfig {
  const rule = resolveChartFieldRule(cfg.chartType);
  const { minDimensions, minMetrics } = chartRenderRequiredCounts(cfg.chartType);

  const dimensions = [...(cfg.dimensions ?? [])]
    .filter((d) => d.field?.trim())
    .slice(0, rule.maxDimensions);
  const metrics = [...(cfg.metrics ?? [])]
    .filter((m) => m.field?.trim())
    .slice(0, rule.maxMetrics);

  while (dimensions.length < minDimensions) dimensions.push({ field: "" });
  while (metrics.length < minMetrics) metrics.push({ field: "" });

  return { ...cfg, dimensions, metrics };
}
