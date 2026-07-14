import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { activeFieldRefs } from "@/lib/chartConfigState";

export type ChartRenderModel =
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | {
      kind: "table";
      displayCols: string[];
    }
  | {
      kind: "apex";
      chartType: "line" | "bar";
      categories: string[];
      series: Array<{ name: string; data: number[] }>;
    }
  | {
      kind: "pie";
      dim: string;
      metric: string;
    };

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
  if (config.chartType === "table") {
    const fields = [
      ...activeFieldRefs(config.dimensions).map((d) => d.field),
      ...activeFieldRefs(config.metrics).map((m) => m.field),
    ];
    const displayCols = pickColumns(columns, fields);
    if (rows.length === 0) return { kind: "empty" };
    return { kind: "table", displayCols: displayCols.length ? displayCols : columns };
  }

  const dims = activeFieldRefs(config.dimensions);
  const metrics = activeFieldRefs(config.metrics);
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

  if (config.chartType === "pie") {
    return { kind: "pie", dim, metric: metrics[0].field };
  }

  const dimIdx = columns.indexOf(dim);
  const categories = rows.map((r) => String(r[dimIdx] ?? ""));
  const series = metrics.map((metric) => {
    const idx = columns.indexOf(metric.field);
    return {
      name: metric.field,
      data: rows.map((r) => parseMetricValue(r[idx]) ?? 0),
    };
  });

  const chartType = config.chartType === "line" ? "line" : "bar";
  return { kind: "apex", chartType, categories, series };
}
