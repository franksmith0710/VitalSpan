import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { isLegacyTableChartType } from "@/lib/chartViewConfig";
import { activeFieldRefs } from "@/lib/chartConfigState";
import { getChartPlugin } from "@/components/charts/engine/plugins/registry";

export type ChartRenderModel =
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "table"; displayCols: string[] }
  | { kind: "ready" };

export function parseMetricValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickColumns(columns: string[], fields: string[]): string[] {
  if (!fields.length) return columns;
  return fields.filter((f) => columns.includes(f));
}

export function buildChartRenderModel(
  config: ChartViewConfig,
  columns: string[],
  rows: (string | number | boolean | null)[][],
): ChartRenderModel {
  if (isLegacyTableChartType(config.chartType)) {
    const fields = [
      ...activeFieldRefs(config.dimensions).map((d) => d.field),
      ...activeFieldRefs(config.metrics).map((m) => m.field),
    ];
    const displayCols = pickColumns(columns, fields);
    if (rows.length === 0) return { kind: "empty" };
    return { kind: "table", displayCols: displayCols.length ? displayCols : columns };
  }

  const plugin = getChartPlugin(config.chartType);
  if (plugin?.library === "s2") {
    if (rows.length === 0) return { kind: "empty" };
    return { kind: "ready" };
  }

  if (config.chartType === "kpi") {
    const metrics = activeFieldRefs(config.metrics);
    if (!metrics.length) return { kind: "error", message: "请配置指标字段" };
    for (const metric of metrics) {
      if (!columns.includes(metric.field)) {
        return { kind: "error", message: `指标列「${metric.field}」不存在，请检查字段配置` };
      }
    }
    if (rows.length === 0) return { kind: "empty" };
    return { kind: "ready" };
  }

  const dims = activeFieldRefs(config.dimensions);
  const metrics = activeFieldRefs(config.metrics);

  if (config.chartType === "map") {
    const regionDim = dims[0]?.field;
    if (!regionDim) return { kind: "error", message: "请配置地理维度字段" };
    if (!metrics.length) return { kind: "error", message: "请配置指标字段" };
    if (!columns.includes(regionDim)) {
      return { kind: "error", message: `维度列「${regionDim}」不存在，请检查字段配置` };
    }
    for (const metric of metrics) {
      if (!columns.includes(metric.field)) {
        return { kind: "error", message: `指标列「${metric.field}」不存在，请检查字段配置` };
      }
    }
    if (rows.length === 0) return { kind: "empty" };

    return { kind: "ready" };
  }

  if (config.chartType === "heatmap" || config.chartType === "t-heatmap") {
    const xDim = dims[0]?.field;
    const yDim = dims[1]?.field;
    if (!xDim || !yDim) return { kind: "error", message: "请配置横轴与纵轴维度" };
    if (!metrics.length) return { kind: "error", message: "请配置指标字段" };
    if (!columns.includes(xDim)) {
      return { kind: "error", message: `横轴列「${xDim}」不存在，请检查字段配置` };
    }
    if (!columns.includes(yDim)) {
      return { kind: "error", message: `纵轴列「${yDim}」不存在，请检查字段配置` };
    }
    for (const metric of metrics) {
      if (!columns.includes(metric.field)) {
        return { kind: "error", message: `指标列「${metric.field}」不存在，请检查字段配置` };
      }
    }
    if (rows.length === 0) return { kind: "empty" };
    return { kind: "ready" };
  }

  if (config.chartType === "sankey" || config.chartType === "graph") {
    const src = dims[0]?.field;
    const dst = dims[1]?.field;
    if (!src || !dst) return { kind: "error", message: "请配置起止维度字段" };
    if (!metrics.length) return { kind: "error", message: "请配置指标字段" };
    for (const field of [src, dst, ...metrics.map((m) => m.field)]) {
      if (!columns.includes(field)) {
        return { kind: "error", message: `列「${field}」不存在，请检查字段配置` };
      }
    }
    if (rows.length === 0) return { kind: "empty" };
    return { kind: "ready" };
  }

  const dim = dims[0]?.field;
  if (!dim) return { kind: "error", message: "请配置维度字段" };
  if (!metrics.length) return { kind: "error", message: "请配置指标字段" };
  if (!columns.includes(dim)) {
    return { kind: "error", message: `维度列「${dim}」不存在，请检查字段配置` };
  }
  for (const metric of metrics) {
    if (!columns.includes(metric.field)) {
      return { kind: "error", message: `指标列「${metric.field}」不存在，请检查字段配置` };
    }
  }
  if (rows.length === 0) return { kind: "empty" };
  return { kind: "ready" };
}
