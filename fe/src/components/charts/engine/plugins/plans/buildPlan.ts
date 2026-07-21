import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
  colIndex,
} from "@/components/charts/engine/buildDatasetEncoding";
import {
  barRangePlan,
  bulletGraphPlan,
  progressBarPlan,
  stockLinePlan,
} from "@/components/charts/engine/plugins/plans/buildComparePlans";
import { encodeCartesianRows } from "@/components/charts/engine/antv/spec/encodeCartesian";
import { encodePieRows } from "@/components/charts/engine/antv/spec/encodePie";
import { PIE_RADIUS_FRAC_DEFAULT } from "@/components/charts/engine/d3/radial/pieLayout";
import type { ChartViewModel, RenderSpec } from "@/components/charts/engine/types";

export function emptyPlan(plotType = "Line"): ChartRenderPlan {
  return { kind: "d3", plotType, options: { data: [] }, empty: true };
}

export function d3Plan(plotType: string, options: Record<string, unknown>): ChartRenderPlan {
  return { kind: "d3", plotType, options };
}

function specWithMetrics(spec: RenderSpec, metricFields: string[]): RenderSpec {
  const allowed = new Set(metricFields.filter(Boolean));
  return {
    ...spec,
    encoding: {
      ...spec.encoding,
      metrics: spec.encoding.metrics.filter((m) => allowed.has(m.field)),
    },
  };
}

/** 仪表盘/水波图：0~1 原样；1~100 视为百分比；更大数值按首行展示原值 */
function resolveQuotaPercent(value: number): { percent: number; rawValue: number } {
  if (!Number.isFinite(value)) return { percent: 0, rawValue: 0 };
  if (value >= 0 && value <= 1) return { percent: value, rawValue: value };
  if (value > 1 && value <= 100) return { percent: value / 100, rawValue: value };
  return { percent: 0, rawValue: value };
}

function gaugePlan(rows: unknown[][], columns: string[], metricField: string): ChartRenderPlan {
  const mi = colIndex(columns, metricField);
  const value = rows.length ? Number(rows[0]?.[mi] ?? 0) : 0;
  const { percent, rawValue } = resolveQuotaPercent(value);
  return d3Plan("Gauge", {
    percent,
    rawValue,
    range: { color: ["#465fff", "#e4e7ec"] },
    indicator: { pointer: { style: { stroke: "#465fff" } } },
    statistic: { content: { formatter: () => `${rawValue}` } },
  });
}

function liquidPlan(rows: unknown[][], columns: string[], metricField: string): ChartRenderPlan {
  const mi = colIndex(columns, metricField);
  const value = rows.length ? Number(rows[0]?.[mi] ?? 0) : 0;
  const { percent, rawValue } = resolveQuotaPercent(value);
  return d3Plan("Liquid", { percent, rawValue });
}

function kpiPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const metrics = spec.encoding.metrics.map((m) => ({
    field: m.field,
    label: m.label ?? m.field,
  }));
  return d3Plan("Kpi", { metrics, rows, columns });
}

function aggregateByDimension(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
  valueMapper: (row: unknown[], di: number, mi: number) => Record<string, string | number>,
): Record<string, string | number>[] {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const di = colIndex(columns, dim);
  const mi = colIndex(columns, metric);
  if (di < 0 || mi < 0) return [];

  const map = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    const key = String(row[di] ?? "");
    const mapped = valueMapper(row, di, mi);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, mapped);
      continue;
    }
    for (const [field, val] of Object.entries(mapped)) {
      if (field === "type" || field === "stage") continue;
      if (typeof val === "number") {
        existing[field] = Number(existing[field] ?? 0) + val;
      }
    }
  }
  return [...map.values()];
}

function funnelPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const data = aggregateByDimension(spec, rows, columns, (row, di, mi) => ({
    stage: String(row[di] ?? ""),
    number: Number(row[mi] ?? 0),
  })).map((row) => ({
    stage: String(row.stage ?? ""),
    number: Number(row.number ?? 0),
  }));
  return d3Plan("Funnel", { data, xField: "stage", yField: "number" });
}

function sankeyPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const src = spec.encoding.dimensions[0]?.field ?? "";
  const dst = spec.encoding.dimensions[1]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const si = colIndex(columns, src);
  const di = colIndex(columns, dst);
  const mi = colIndex(columns, metric);
  const data = rows.map((r) => ({
    source: String(r[si] ?? ""),
    target: String(r[di] ?? ""),
    value: Number(r[mi] ?? 0),
  }));
  return d3Plan("Sankey", { data, sourceField: "source", targetField: "target", weightField: "value" });
}

function graphPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const src = spec.encoding.dimensions[0]?.field ?? "";
  const dst = spec.encoding.dimensions[1]?.field ?? "";
  const si = colIndex(columns, src);
  const di = colIndex(columns, dst);
  const nodeSet = new Set<string>();
  const edges: Array<{ source: string; target: string }> = [];
  for (const r of rows) {
    const s = String(r[si] ?? "");
    const t = String(r[di] ?? "");
    nodeSet.add(s);
    nodeSet.add(t);
    edges.push({ source: s, target: t });
  }
  const layout = spec.styleVariant === "dagre" ? "dagre" : "force";
  return d3Plan("ForceGraph", {
    nodes: [...nodeSet].map((id) => ({ id, data: { label: id } })),
    edges,
    layout: { type: layout },
  });
}

function heatmapMatrixPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const x = spec.encoding.dimensions[0]?.field ?? "";
  const y = spec.encoding.dimensions[1]?.field ?? "";
  const m = spec.encoding.metrics[0]?.field ?? "";
  const xi = colIndex(columns, x);
  const yi = colIndex(columns, y);
  const mi = colIndex(columns, m);
  const data = rows.map((r) => ({
    x: String(r[xi] ?? ""),
    y: String(r[yi] ?? ""),
    value: Number(r[mi] ?? 0),
  }));
  return d3Plan("Heatmap", { data, xField: "x", yField: "y", colorField: "value" });
}

function piePlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  variant: "default" | "donut" | "rose" | "donut-rose",
): ChartRenderPlan {
  const data = encodePieRows(spec, rows, columns);
  const innerRadius =
    variant === "donut" || variant === "donut-rose" ? 0.5 : variant === "rose" ? 0.2 : 0;
  return d3Plan("Pie", {
    data,
    angleField: "value",
    colorField: "type",
    radius: PIE_RADIUS_FRAC_DEFAULT,
    innerRadius,
    roseType: variant === "rose" || variant === "donut-rose" ? "radius" : undefined,
  });
}

function columnPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  opts: { horizontal?: boolean; stack?: boolean; group?: boolean; percent?: boolean },
): ChartRenderPlan {
  const enc = encodeCartesianRows(spec, rows, columns, "bar");
  const horizontal = opts.horizontal ?? false;
  const plotType = horizontal ? "Bar" : "Column";
  return d3Plan(plotType, {
    data: enc.data,
    xField: enc.xField,
    yField: enc.yField,
    seriesField: enc.seriesField,
    isStack: opts.stack ?? false,
    isGroup: opts.group ?? false,
    isPercent: opts.percent ?? false,
    isHorizontal: horizontal,
  });
}

function linePlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  vm: ChartViewModel,
  rows: unknown[][],
  columns: string[],
  opts: { area?: boolean; stack?: boolean; smooth?: boolean },
): ChartRenderPlan {
  const enc = encodeCartesianRows(spec, rows, columns, "line");
  const isHorizontal = enc.isHorizontal;
  return d3Plan(isHorizontal ? "Bar" : "Line", {
    data: enc.data,
    xField: enc.xField,
    yField: enc.yField,
    seriesField: enc.seriesField,
    smooth: opts.smooth ?? vm.styleVariant === "smooth",
    area: opts.area ? {} : undefined,
    isStack: opts.stack ?? false,
    isHorizontal,
  });
}

function dualAxesPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  mode: "default" | "group" | "stack" | "dual-line",
): ChartRenderPlan {
  const metrics = spec.encoding.metrics.map((m) => m.field).filter(Boolean);
  const lineMetric = metrics[0] ?? "";
  const columnMetric = metrics[1] ?? metrics[0] ?? "";

  if (mode === "dual-line") {
    const lineEnc = encodeCartesianRows(
      specWithMetrics(spec, [lineMetric]),
      rows,
      columns,
      "line",
    );
    const lineEnc2 = encodeCartesianRows(
      specWithMetrics(spec, [columnMetric]),
      rows,
      columns,
      "line",
    );
    return d3Plan("DualAxes", {
      data: [lineEnc.data, lineEnc2.data],
      xField: lineEnc.xField,
      yField: [lineEnc.yField, lineEnc2.yField],
      lineLabels: [lineMetric, columnMetric],
      geometryOptions: [{ geometry: "line" }, { geometry: "line" }],
    });
  }

  const lineEnc = encodeCartesianRows(
    specWithMetrics(spec, [lineMetric]),
    rows,
    columns,
    "line",
  );
  const barEnc = encodeCartesianRows(
    specWithMetrics(spec, [columnMetric]),
    rows,
    columns,
    "bar",
  );
  return d3Plan("DualAxes", {
    data: [lineEnc.data, barEnc.data],
    xField: lineEnc.xField,
    yField: [lineEnc.yField, barEnc.yField],
    lineLabels: [lineMetric, columnMetric],
    geometryOptions: [
      { geometry: "line" },
      { geometry: "column", isGroup: mode === "group", isStack: mode === "stack" },
    ],
  });
}

function bidirectionalBarPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const leftField = spec.encoding.metrics[0]?.field ?? "";
  const rightField = spec.encoding.metrics[1]?.field ?? leftField;
  const di = colIndex(columns, dim);
  const li = colIndex(columns, leftField);
  const ri = colIndex(columns, rightField);
  if (di < 0 || li < 0) return emptyPlan("BidirectionalBar");

  const map = new Map<string, { type: string; left: number; right: number }>();
  for (const row of rows) {
    const key = String(row[di] ?? "");
    const cur = map.get(key) ?? { type: key, left: 0, right: 0 };
    cur.left += Number(row[li] ?? 0);
    if (ri >= 0) cur.right += Number(row[ri] ?? 0);
    map.set(key, cur);
  }
  return d3Plan("BidirectionalBar", { data: [...map.values()] });
}

function bulletGraphPlanWrapper(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  return bulletGraphPlan(spec, rows, columns);
}

function progressBarPlanWrapper(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  return progressBarPlan(spec, rows, columns);
}

function scatterPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  multi = false,
): ChartRenderPlan {
  const metrics = spec.encoding.metrics.map((m) => m.field).filter(Boolean);
  const xField = metrics[0] ?? spec.encoding.dimensions[0]?.field ?? "";
  const yField = metrics[1] ?? metrics[0] ?? "";
  const xi = colIndex(columns, xField);
  const yi = colIndex(columns, yField);
  const seriesField = multi && metrics.length > 2 ? metrics[2] : undefined;
  const si = seriesField ? colIndex(columns, seriesField) : -1;
  const data = rows.map((r) => ({
    x: Number(r[xi] ?? 0),
    y: Number(r[yi] ?? 0),
    ...(seriesField && si >= 0 ? { series: String(r[si] ?? "") } : {}),
  }));
  return d3Plan("Scatter", { data, xField: "x", yField: "y", colorField: seriesField ? "series" : undefined });
}

function d3TablePlan(type: string, vm: ChartViewModel): ChartRenderPlan {
  const spec = chartViewModelToRenderSpec(vm);
  const { rows: capped } = capRows(vm.dataset.rows, ADVANCED_CHART_ROW_CAP);
  const plotType =
    type === "table-pivot" ? "TablePivot" : type === "table-normal" ? "TableNormal" : "TableInfo";
  return d3Plan(plotType, { rows: capped, columns: vm.dataset.columns, spec });
}

export function buildPlanForType(chartType: string, vm: ChartViewModel): ChartRenderPlan {
  const spec = chartViewModelToRenderSpec(vm);
  const { rows: capped } = capRows(vm.dataset.rows, ADVANCED_CHART_ROW_CAP);
  const columns = vm.dataset.columns;

  if (capped.length === 0 && chartType !== "map") {
    return emptyPlan();
  }

  switch (chartType) {
    case "line":
      return linePlan(spec, vm, capped, columns, { smooth: vm.styleVariant === "smooth" });
    case "area":
      return linePlan(spec, vm, capped, columns, { area: true });
    case "area-stack":
      return linePlan(spec, vm, capped, columns, { area: true, stack: true });
    case "bar":
      return columnPlan(spec, capped, columns, {});
    case "bar-stack":
      return columnPlan(spec, capped, columns, { stack: true });
    case "bar-group":
      return columnPlan(spec, capped, columns, { group: true });
    case "bar-group-stack":
      return columnPlan(spec, capped, columns, { stack: true, group: true });
    case "percentage-bar-stack":
      return columnPlan(spec, capped, columns, { stack: true, percent: true });
    case "bar-horizontal":
      return columnPlan(spec, capped, columns, { horizontal: true });
    case "bar-stack-horizontal":
      return columnPlan(spec, capped, columns, { horizontal: true, stack: true });
    case "percentage-bar-stack-horizontal":
      return columnPlan(spec, capped, columns, { horizontal: true, stack: true, percent: true });
    case "bar-range":
      return barRangePlan(spec, capped, columns);
    case "progress-bar":
      return progressBarPlanWrapper(spec, capped, columns);
    case "bullet-graph":
      return bulletGraphPlanWrapper(spec, capped, columns);
    case "stock-line":
      return stockLinePlan(spec, capped, columns);
    case "pie":
      return piePlan(spec, capped, columns, "default");
    case "pie-donut":
      return piePlan(spec, capped, columns, "donut");
    case "pie-rose":
      return piePlan(spec, capped, columns, "rose");
    case "pie-donut-rose":
      return piePlan(spec, capped, columns, "donut-rose");
    case "gauge":
      return gaugePlan(capped, columns, spec.encoding.metrics[0]?.field ?? "");
    case "liquid":
      return liquidPlan(capped, columns, spec.encoding.metrics[0]?.field ?? "");
    case "kpi":
      return kpiPlan(spec, capped, columns);
    case "funnel":
      return funnelPlan(spec, capped, columns);
    case "sankey":
      return sankeyPlan(spec, capped, columns);
    case "graph":
      return graphPlan(spec, capped, columns);
    case "scatter":
      return scatterPlan(spec, capped, columns);
    case "quadrant":
      return scatterPlan(spec, capped, columns);
    case "multi-scatter":
      return scatterPlan(spec, capped, columns, true);
    case "chart-mix":
      return dualAxesPlan(spec, capped, columns, "default");
    case "chart-mix-group":
      return dualAxesPlan(spec, capped, columns, "group");
    case "chart-mix-stack":
      return dualAxesPlan(spec, capped, columns, "stack");
    case "chart-mix-dual-line":
      return dualAxesPlan(spec, capped, columns, "dual-line");
    case "t-heatmap":
    case "heatmap":
      return heatmapMatrixPlan(spec, capped, columns);
    case "map":
      return d3Plan("Choropleth", { rows: capped, columns, spec });
    case "table-info":
    case "table-normal":
    case "table-pivot":
      return d3TablePlan(chartType, vm);
    case "radar":
      return d3Plan("Radar", { data: encodePieRows(spec, capped, columns), xField: "type", yField: "value" });
    case "treemap":
      return d3Plan("Treemap", {
        data: encodePieRows(spec, capped, columns).map((d) => ({ name: d.type, value: d.value })),
        colorField: "name",
      });
    case "circle-packing":
      return d3Plan("CirclePacking", {
        data: encodePieRows(spec, capped, columns).map((d) => ({ name: d.type, value: d.value })),
        sizeField: "value",
      });
    case "word-cloud":
    case "wordCloud":
      return d3Plan("WordCloud", {
        data: encodePieRows(spec, capped, columns).map((d) => ({ word: d.type, weight: d.value })),
        wordField: "word",
        weightField: "weight",
      });
    case "bidirectional-bar":
      return bidirectionalBarPlan(spec, capped, columns);
    case "waterfall":
      return d3Plan("Waterfall", {
        data: encodePieRows(spec, capped, columns).map((d) => ({ type: d.type, value: d.value })),
      });
    case "timeline":
      return linePlan(spec, vm, capped, columns, { smooth: vm.styleVariant === "smooth" });
    case "combo":
      return dualAxesPlan(spec, capped, columns, "default");
    default:
      return emptyPlan();
  }
}
