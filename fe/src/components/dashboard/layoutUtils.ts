import type { ChartViewConfig, ChartType } from "@/lib/chartViewConfig";

export type LayoutWidget = {
  id: string;
  type: "chart";
  title: string;
  colSpan: 4 | 6 | 8 | 12;
  rowSpan: number;
  order: number;
  chartConfig: ChartViewConfig;
};

export type DashboardLayout = {
  version: 1;
  widgets: LayoutWidget[];
  globalFilters: unknown[];
};

export function sortWidgets(widgets: LayoutWidget[]): LayoutWidget[] {
  return [...widgets].sort((a, b) => a.order - b.order);
}

export function moveWidget(widgets: LayoutWidget[], id: string, direction: "up" | "down"): LayoutWidget[] {
  const sorted = sortWidgets(widgets);
  const idx = sorted.findIndex((w) => w.id === id);
  if (idx < 0) return widgets;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return widgets;
  const next = [...sorted];
  const aOrder = next[idx].order;
  next[idx] = { ...next[idx], order: next[swapIdx].order };
  next[swapIdx] = { ...next[swapIdx], order: aOrder };
  return next;
}

export function resizeWidget(
  widgets: LayoutWidget[],
  id: string,
  patch: Partial<Pick<LayoutWidget, "colSpan" | "rowSpan" | "title">>,
): LayoutWidget[] {
  return widgets.map((w) => (w.id === id ? { ...w, ...patch } : w));
}

export function normalizeWidgetIds(widgets: LayoutWidget[]): LayoutWidget[] {
  return widgets.map((w) => ({
    ...w,
    chartConfig: { ...w.chartConfig, chartId: w.id },
  }));
}

export function defaultChartConfig(type: ChartType): ChartViewConfig {
  const base = {
    dataSourceId: "",
    mode: "sql" as const,
  };
  if (type === "table") {
    return { chartType: "table", ...base, sql: "SELECT 1 AS id", dimensions: [], metrics: [] };
  }
  if (type === "map") {
    return {
      chartType: "map",
      ...base,
      sql: "SELECT '北京' AS region, 100 AS value",
      dimensions: [{ field: "region" }],
      metrics: [{ field: "value" }],
    };
  }
  if (type === "heatmap") {
    return {
      chartType: "heatmap",
      ...base,
      sql: "SELECT 'A' AS x, '1' AS y, 10 AS v",
      dimensions: [{ field: "x" }, { field: "y" }],
      metrics: [{ field: "v" }],
    };
  }
  if (type === "kpi") {
    return {
      chartType: "kpi",
      ...base,
      sql: "SELECT 1280 AS total, 12.5 AS rate",
      dimensions: [],
      metrics: [{ field: "total" }, { field: "rate" }],
    };
  }
  if (type === "timeline") {
    return {
      chartType: "timeline",
      ...base,
      sql: "SELECT '2026-01-01' AS t, 1 AS v",
      dimensions: [{ field: "t" }],
      metrics: [{ field: "v" }],
    };
  }
  return {
    chartType: type,
    ...base,
    sql: "SELECT 1 AS x, 1 AS y",
    dimensions: [{ field: "x" }],
    metrics: [{ field: "y" }],
  };
}
