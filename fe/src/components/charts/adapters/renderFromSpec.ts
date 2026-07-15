import type { ChartFieldRef } from "@/lib/chartViewConfig";
import regionsGeo from "@/assets/geo/regions-simplified.json";
import * as echarts from "echarts/core";

export const ADVANCED_CHART_ROW_CAP = 500;
export const GRAPH_NODE_CAP = 200;
export const SANKEY_LINK_CAP = 300;

export type RenderSpec = {
  engine: "echarts" | "table";
  chartType: string;
  styleVariant: string;
  encoding: { dimensions: ChartFieldRef[]; metrics: ChartFieldRef[] };
  source: Record<string, unknown>;
};

type EChartsOption = Record<string, unknown>;

export const FALLBACK_CHART_TYPE = "table";

export function getFallbackChartType(type: string): string {
  const known = [
    "bar", "line", "pie", "table", "funnel", "sankey",
    "graph", "map", "heatmap", "timeline", "gauge", "kpi",
  ];
  return known.includes(type) ? type : FALLBACK_CHART_TYPE;
}

export function safeColIndex(columns: string[], field: string): number | null {
  const idx = columns.indexOf(field);
  return idx >= 0 ? idx : null;
}

function colIndex(columns: string[], field: string): number {
  return columns.indexOf(field);
}

export function capRows<T>(rows: T[], cap: number): { rows: T[]; truncated: boolean } {
  if (rows.length <= cap) return { rows, truncated: false };
  return { rows: rows.slice(0, cap), truncated: true };
}

function buildFunnelOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const di = colIndex(columns, dim);
  const mi = colIndex(columns, metric);
  const data = rows.map((r) => ({ name: String(r[di] ?? ""), value: Number(r[mi] ?? 0) }));
  return { series: [{ type: "funnel", sort: "descending", data }] };
}

function buildSankeyOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const src = spec.encoding.dimensions[0]?.field ?? "";
  const dst = spec.encoding.dimensions[1]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const si = colIndex(columns, src);
  const di = colIndex(columns, dst);
  const mi = colIndex(columns, metric);
  const { rows: capped } = capRows(rows, SANKEY_LINK_CAP);
  const links = capped.map((r) => ({
    source: String(r[si] ?? ""),
    target: String(r[di] ?? ""),
    value: Number(r[mi] ?? 0),
  }));
  const nodes = [...new Set(links.flatMap((l) => [l.source, l.target]))].map((name) => ({ name }));
  return { series: [{ type: "sankey", data: nodes, links }] };
}

function buildGraphOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const src = spec.encoding.dimensions[0]?.field ?? "";
  const dst = spec.encoding.dimensions[1]?.field ?? "";
  const si = colIndex(columns, src);
  const di = colIndex(columns, dst);
  const nodeSet = new Set<string>();
  const links: Array<{ source: string; target: string; value?: number }> = [];
  for (const r of rows) {
    const s = String(r[si] ?? "");
    const t = String(r[di] ?? "");
    nodeSet.add(s);
    nodeSet.add(t);
    links.push({ source: s, target: t, value: 1 });
    if (nodeSet.size > GRAPH_NODE_CAP) break;
  }
  const nodes = [...nodeSet].slice(0, GRAPH_NODE_CAP).map((name) => ({ name, value: 1 }));
  return {
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        data: nodes,
        links: links.slice(0, GRAPH_NODE_CAP),
      },
    ],
  };
}

function buildMapOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  const regionField = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const ri = colIndex(columns, regionField);
  const mi = colIndex(columns, metric);
  echarts.registerMap("vs-regions", regionsGeo as never);
  const data = rows.map((r) => ({ name: String(r[ri] ?? ""), value: Number(r[mi] ?? 0) }));
  return { series: [{ type: "map", map: "vs-regions", data }] };
}

function buildHeatmapOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const xField = spec.encoding.dimensions[0]?.field ?? "";
  const yField = spec.encoding.dimensions[1]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const xi = colIndex(columns, xField);
  const yi = colIndex(columns, yField);
  const mi = colIndex(columns, metric);
  const xCats = [...new Set(rows.map((r) => String(r[xi] ?? "")))];
  const yCats = [...new Set(rows.map((r) => String(r[yi] ?? "")))];
  const data = rows.map((r) => [String(r[xi] ?? ""), String(r[yi] ?? ""), Number(r[mi] ?? 0)]);
  return {
    tooltip: { position: "top" },
    grid: { containLabel: true },
    xAxis: { type: "category", data: xCats },
    yAxis: { type: "category", data: yCats },
    visualMap: { min: 0, max: Math.max(...data.map((d) => Number(d[2])), 1), calculable: true },
    series: [{ type: "heatmap", data }],
  };
}

function buildTimelineOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const timeField = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const ti = colIndex(columns, timeField);
  const mi = colIndex(columns, metric);
  const points = rows.map((r) => [String(r[ti] ?? ""), Number(r[mi] ?? 0)]);
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: points.map((p) => p[0]) },
    yAxis: { type: "value" },
    series: [{ type: "line", data: points.map((p) => p[1]) }],
  };
}

function buildGaugeOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const mi = colIndex(columns, metric);
  const value = rows.length ? Number(rows[0][mi] ?? 0) : 0;
  return { series: [{ type: "gauge", data: [{ value }] }] };
}

export function buildBarOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metrics = spec.encoding.metrics.map((m) => m.field);
  const di = safeColIndex(columns, dim);
  const xData = di !== null ? rows.map((r) => String(r[di] ?? "")) : [];
  const series = metrics.map((metric) => {
    const mi = safeColIndex(columns, metric);
    const data = mi !== null ? rows.map((r) => Number(r[mi] ?? 0)) : [];
    const base: Record<string, unknown> = { type: "bar", name: metric, data };
    if (spec.styleVariant === "stacked" || spec.styleVariant === "grouped") {
      base.stack = spec.styleVariant === "stacked" ? "total" : undefined;
    }
    if (spec.styleVariant === "horizontal") {
      return { ...base, type: "bar" };
    }
    return base;
  });
  const isHorizontal = spec.styleVariant === "horizontal";
  return {
    xAxis: isHorizontal
      ? { type: "value" }
      : { type: "category", data: xData },
    yAxis: isHorizontal
      ? { type: "category", data: xData }
      : { type: "value" },
    series,
  };
}

export function buildLineOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metrics = spec.encoding.metrics.map((m) => m.field);
  const di = safeColIndex(columns, dim);
  const xData = di !== null ? rows.map((r) => String(r[di] ?? "")) : [];
  const series = metrics.map((metric) => {
    const mi = safeColIndex(columns, metric);
    const data = mi !== null ? rows.map((r) => Number(r[mi] ?? 0)) : [];
    const base: Record<string, unknown> = {
      type: "line",
      name: metric,
      data,
      smooth: spec.styleVariant === "smooth",
    };
    if (spec.styleVariant === "stacked") {
      base.stack = "total";
    }
    return base;
  });
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: xData },
    yAxis: { type: "value" },
    series,
  };
}

export function buildPieOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const di = safeColIndex(columns, dim);
  const mi = safeColIndex(columns, metric);
  const data = rows.map((r) => ({
    name: di !== null ? String(r[di] ?? "") : "",
    value: mi !== null ? Number(r[mi] ?? 0) : 0,
  }));
  const radius: string | string[] =
    spec.styleVariant === "donut" ? ["40%", "70%"] : "70%";
  return { series: [{ type: "pie", radius, data }] };
}

export function buildEchartsOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
): EChartsOption {
  const { rows: capped } = capRows(rows, ADVANCED_CHART_ROW_CAP);
  switch (spec.chartType) {
    case "bar":
      return buildBarOption(spec, capped, columns);
    case "line":
      return buildLineOption(spec, capped, columns);
    case "funnel":
      return buildFunnelOption(spec, capped, columns);
    case "sankey":
      return buildSankeyOption(spec, capped, columns);
    case "graph":
      return buildGraphOption(spec, capped, columns);
    case "map":
      return buildMapOption(spec, capped, columns);
    case "heatmap":
      return buildHeatmapOption(spec, capped, columns);
    case "timeline":
      return buildTimelineOption(spec, capped, columns);
    case "gauge":
      return buildGaugeOption(spec, capped, columns);
    case "pie":
      return buildPieOption(spec, capped, columns);
    default:
      return { series: [], dataset: { source: [] } };
  }
}
