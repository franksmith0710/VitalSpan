import type { ChartFieldRef } from "@/lib/chartViewConfig";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { GeoChartStyle } from "@/lib/geoMapChart";
import { DE_AREA_FILL_OPACITY } from "@/lib/echartsSeriesPresentation";
import {
  buildGeoHeatmapEchartsOption,
  buildGeoHeatmapPlaceholderEchartsOption,
  buildGeoMapEchartsOption,
  buildGeoMapPlaceholderEchartsOption,
  isNumericRegionIdDimension,
} from "@/lib/geoMapChart";

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

export type BuildEchartsStyleContext = {
  geo?: GeoChartStyle;
  showLabel?: boolean;
  pie?: { innerRadiusPercent?: number };
  isDark?: boolean;
  embedEdit?: boolean;
  valueFormat?: NumberFormatConfig;
};

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

function buildMapOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
  style?: BuildEchartsStyleContext,
): EChartsOption {
  const regionField = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  if (
    !regionField ||
    !metric ||
    rows.length === 0 ||
    isNumericRegionIdDimension(regionField, columns, rows)
  ) {
    return buildGeoMapPlaceholderEchartsOption({
      geo: style?.geo,
      isDark: style?.isDark,
    });
  }
  return buildGeoMapEchartsOption({
    rows,
    columns,
    regionField,
    metricField: metric,
    geo: style?.geo,
    showLabel: style?.showLabel,
    isDark: style?.isDark,
    embedEdit: style?.embedEdit,
    valueFormat: style?.valueFormat,
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
    return buildGeoHeatmapPlaceholderEchartsOption({
      geo: style?.geo,
      isDark: style?.isDark,
    });
  }
  return buildGeoHeatmapEchartsOption({
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

function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

type CartesianSeriesBuild = {
  xData: string[];
  series: Record<string, unknown>[];
  isHorizontal: boolean;
};

/** 类别轴 + 可选子类别拆系列 + 指标聚合（对标 DataEase 折线/柱状） */
function buildCartesianCategorySeries(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
  seriesType: "line" | "bar",
  stylePatch?: (styleVariant: string) => Record<string, unknown>,
): CartesianSeriesBuild {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const subDim = spec.encoding.dimensions[1]?.field;
  const metrics = spec.encoding.metrics.map((m) => m.field).filter(Boolean);
  const isHorizontal = spec.styleVariant === "horizontal";
  const d0i = safeColIndex(columns, dim);
  const d1i = subDim ? safeColIndex(columns, subDim) : null;

  if (d0i === null || metrics.length === 0) {
    return { xData: [], series: [], isHorizontal };
  }

  const xData = uniqueOrdered(rows.map((r) => String(r[d0i] ?? "")));

  const sumAt = (x: string, sub: string | null, metric: string) => {
    const mi = safeColIndex(columns, metric);
    if (mi === null) return 0;
    let sum = 0;
    for (const row of rows) {
      if (String(row[d0i] ?? "") !== x) continue;
      if (sub !== null && d1i !== null && String(row[d1i] ?? "") !== sub) continue;
      sum += Number(row[mi] ?? 0);
    }
    return sum;
  };

  const patch = stylePatch?.(spec.styleVariant) ?? {};

  if (!subDim || d1i === null) {
    const series = metrics.map((metric) => {
      const base: Record<string, unknown> = {
        type: seriesType,
        name: metric,
        data: xData.map((x) => sumAt(x, null, metric)),
        ...patch,
      };
      if (seriesType === "bar" && (spec.styleVariant === "stacked" || spec.styleVariant === "grouped")) {
        base.stack = spec.styleVariant === "stacked" ? "total" : undefined;
      }
      return base;
    });
    return { xData, series, isHorizontal };
  }

  const subValues = uniqueOrdered(rows.map((r) => String(r[d1i] ?? "")));
  const series: Record<string, unknown>[] = [];
  for (const sub of subValues) {
    for (const metric of metrics) {
      const name = metrics.length > 1 ? `${sub}·${metric}` : sub;
      const base: Record<string, unknown> = {
        type: seriesType,
        name,
        data: xData.map((x) => sumAt(x, sub, metric)),
        ...patch,
      };
      if (seriesType === "bar") {
        if (spec.styleVariant === "stacked") base.stack = "total";
        if (spec.styleVariant === "grouped") base.stack = undefined;
      }
      series.push(base);
    }
  }
  return { xData, series, isHorizontal };
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

/** 折线子类型：default / area / smooth（与 backend viz builtin 对齐） */
export function applyLineStyleVariant(styleVariant: string): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (styleVariant === "smooth") {
    patch.smooth = true;
  }
  if (styleVariant === "area") {
    patch.areaStyle = { opacity: DE_AREA_FILL_OPACITY };
  }
  if (styleVariant === "stacked") {
    patch.stack = "total";
    patch.areaStyle = { opacity: DE_AREA_FILL_OPACITY };
  }
  return patch;
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
