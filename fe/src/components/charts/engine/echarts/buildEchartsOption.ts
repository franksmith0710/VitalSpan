import type { ChartFieldRef } from "@/lib/chartViewConfig";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { GeoChartStyle } from "@/components/charts/engine/echarts/geo/geoMapChart";
import { echartsGeoEngine } from "@/components/charts/engine/geoEnginePort";
import type { RenderSpec } from "@/components/charts/engine/types";
import {
  ADVANCED_CHART_ROW_CAP,
  GRAPH_NODE_CAP,
  SANKEY_LINK_CAP,
  applyLineStyleVariant,
  buildCartesianCategorySeries,
  capRows,
  colIndex,
  safeColIndex,
} from "@/components/charts/engine/buildDatasetEncoding";

export {
  ADVANCED_CHART_ROW_CAP,
  GRAPH_NODE_CAP,
  SANKEY_LINK_CAP,
  capRows,
  safeColIndex,
  applyLineStyleVariant,
  buildCartesianCategorySeries,
} from "@/components/charts/engine/buildDatasetEncoding";

export type { RenderSpec } from "@/components/charts/engine/types";

type EChartsOption = Record<string, unknown>;

export type BuildEchartsStyleContext = {
  geo?: GeoChartStyle;
  showLabel?: boolean;
  pie?: { innerRadiusPercent?: number };
  isDark?: boolean;
  embedEdit?: boolean;
  valueFormat?: NumberFormatConfig;
  geoMapLevel?: {
    mapId: string;
    knownRegionNames: string[];
  };
};

export const FALLBACK_CHART_TYPE = "table";

export function getFallbackChartType(type: string): string {
  const known = [
    "bar", "line", "pie", "table", "funnel", "sankey",
    "graph", "map", "heatmap", "timeline", "gauge", "kpi",
  ];
  return known.includes(type) ? type : FALLBACK_CHART_TYPE;
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

function buildMapOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
  style?: BuildEchartsStyleContext,
): EChartsOption {
  const regionField = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  if (!regionField || !metric || rows.length === 0) {
    return echartsGeoEngine.buildMapPlaceholder({
      geo: style?.geo,
      isDark: style?.isDark,
    });
  }
  return echartsGeoEngine.buildMapOption({
    rows,
    columns,
    regionField,
    metricField: metric,
    geo: style?.geo,
    showLabel: style?.showLabel,
    isDark: style?.isDark,
    embedEdit: style?.embedEdit,
    valueFormat: style?.valueFormat,
    mapId: style?.geoMapLevel?.mapId,
    knownRegionNames: style?.geoMapLevel?.knownRegionNames,
  });
}

function buildHeatmapOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
  style?: BuildEchartsStyleContext,
): EChartsOption {
  const xField = spec.encoding.dimensions[0]?.field ?? "";
  const yField = spec.encoding.dimensions[1]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  if (!xField || !yField || !metric) {
    return echartsGeoEngine.buildHeatmapPlaceholder({
      geo: style?.geo,
      isDark: style?.isDark,
    });
  }
  return echartsGeoEngine.buildHeatmapOption({
    rows,
    columns,
    xField,
    yField,
    metricField: metric,
    geo: style?.geo,
    isDark: style?.isDark,
    valueFormat: style?.valueFormat,
  });
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
    series: [
      {
        type: "line",
        data: points.map((p) => p[1]),
        ...applyLineStyleVariant(spec.styleVariant),
      },
    ],
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
  const { xData, series, isHorizontal } = buildCartesianCategorySeries(
    spec,
    rows,
    columns,
    "bar",
  );
  return {
    xAxis: isHorizontal ? { type: "value" } : { type: "category", data: xData },
    yAxis: isHorizontal ? { type: "category", data: xData } : { type: "value" },
    series,
  };
}

export function buildLineOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
): EChartsOption {
  if (rows.length === 0) return { series: [], dataset: { source: [] } };
  const { xData, series } = buildCartesianCategorySeries(
    spec,
    rows,
    columns,
    "line",
    applyLineStyleVariant,
  );
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
  style?: BuildEchartsStyleContext,
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
  const outer = "70%";
  const radius: string | string[] =
    spec.styleVariant === "donut"
      ? [`${style?.pie?.innerRadiusPercent ?? 40}%`, outer]
      : outer;
  return { series: [{ type: "pie", radius, data }] };
}

export function buildEchartsOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
  style?: BuildEchartsStyleContext,
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
      return buildMapOption(spec, capped, columns, style);
    case "heatmap":
      return buildHeatmapOption(spec, capped, columns, style);
    case "timeline":
      return buildTimelineOption(spec, capped, columns);
    case "gauge":
      return buildGaugeOption(spec, capped, columns);
    case "pie":
      return buildPieOption(spec, capped, columns, style);
    default:
      return { series: [], dataset: { source: [] } };
  }
}

// 兼容旧测试对 ChartFieldRef 的间接引用
export type { ChartFieldRef };
