import type { AntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
  colIndex,
} from "@/components/charts/engine/buildDatasetEncoding";
import { encodeCartesianRows } from "@/components/charts/engine/antv/spec/encodeCartesian";
import { encodePieRows } from "@/components/charts/engine/antv/spec/encodePie";
import type { ChartViewModel } from "@/components/charts/engine/types";

export function emptyPlan(plotType = "Line"): AntvRenderPlan {
  return { kind: "g2plot", plotType, options: { data: [] }, empty: true };
}

function gaugePlan(rows: unknown[][], columns: string[], metricField: string): AntvRenderPlan {
  const mi = colIndex(columns, metricField);
  const value = rows.length ? Number(rows[0]?.[mi] ?? 0) : 0;
  return {
    kind: "g2plot",
    plotType: "Gauge",
    options: {
      percent: Math.min(1, Math.max(0, value / 100)),
      range: { color: ["#465fff", "#e4e7ec"] },
      indicator: { pointer: { style: { stroke: "#465fff" } } },
      statistic: { content: { formatter: () => `${value}` } },
    },
  };
}

function liquidPlan(rows: unknown[][], columns: string[], metricField: string): AntvRenderPlan {
  const mi = colIndex(columns, metricField);
  const value = rows.length ? Number(rows[0]?.[mi] ?? 0) : 0;
  return {
    kind: "g2plot",
    plotType: "Liquid",
    options: { percent: Math.min(1, Math.max(0, value / 100)) },
  };
}

function funnelPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): AntvRenderPlan {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const di = colIndex(columns, dim);
  const mi = colIndex(columns, metric);
  const data = rows.map((r) => ({ stage: String(r[di] ?? ""), number: Number(r[mi] ?? 0) }));
  return { kind: "g2plot", plotType: "Funnel", options: { data, xField: "stage", yField: "number" } };
}

function sankeyPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): AntvRenderPlan {
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
  return {
    kind: "g2plot",
    plotType: "Sankey",
    options: { data, sourceField: "source", targetField: "target", weightField: "value" },
  };
}

function graphPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): AntvRenderPlan {
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
  return {
    kind: "g6",
    plotType: layout,
    options: { nodes: [...nodeSet].map((id) => ({ id, data: { label: id } })), edges, layout: { type: layout } },
  };
}

function heatmapMatrixPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): AntvRenderPlan {
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
  return { kind: "g2plot", plotType: "Heatmap", options: { data, xField: "x", yField: "y", colorField: "value" } };
}

function piePlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  variant: "default" | "donut" | "rose" | "donut-rose",
): AntvRenderPlan {
  const data = encodePieRows(spec, rows, columns);
  const innerRadius =
    variant === "donut" || variant === "donut-rose" ? 0.5 : variant === "rose" ? 0.2 : 0;
  return {
    kind: "g2plot",
    plotType: "Pie",
    options: {
      data,
      angleField: "value",
      colorField: "type",
      radius: 0.8,
      innerRadius,
      roseType: variant === "rose" || variant === "donut-rose" ? "radius" : undefined,
    },
  };
}

function columnPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  opts: { horizontal?: boolean; stack?: boolean; group?: boolean; percent?: boolean },
): AntvRenderPlan {
  const enc = encodeCartesianRows(spec, rows, columns, "bar");
  const horizontal = opts.horizontal ?? false;
  const plotType = horizontal ? "Bar" : "Column";
  return {
    kind: "g2plot",
    plotType,
    options: {
      data: enc.data,
      xField: horizontal ? enc.yField : enc.xField,
      yField: horizontal ? enc.xField : enc.yField,
      seriesField: enc.seriesField,
      isStack: opts.stack ?? false,
      isGroup: opts.group ?? false,
      isPercent: opts.percent ?? false,
    },
  };
}

function linePlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  vm: ChartViewModel,
  rows: unknown[][],
  columns: string[],
  opts: { area?: boolean; stack?: boolean; smooth?: boolean },
): AntvRenderPlan {
  const enc = encodeCartesianRows(spec, rows, columns, "line");
  const plotType = enc.isHorizontal ? "Bar" : "Line";
  return {
    kind: "g2plot",
    plotType,
    options: {
      data: enc.data,
      xField: enc.isHorizontal ? enc.yField : enc.xField,
      yField: enc.isHorizontal ? enc.xField : enc.yField,
      seriesField: enc.seriesField,
      smooth: opts.smooth ?? vm.styleVariant === "smooth",
      area: opts.area ? {} : undefined,
      isStack: opts.stack ?? false,
    },
  };
}

function dualAxesPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  mode: "default" | "group" | "stack" | "dual-line",
): AntvRenderPlan {
  const lineEnc = encodeCartesianRows(spec, rows, columns, "line");
  const barEnc = encodeCartesianRows(spec, rows, columns, "bar");
  if (mode === "dual-line") {
    return {
      kind: "g2plot",
      plotType: "DualAxes",
      options: {
        data: [lineEnc.data, lineEnc.data],
        xField: lineEnc.xField,
        yField: [lineEnc.yField, lineEnc.yField],
        geometryOptions: [{ geometry: "line" }, { geometry: "line" }],
      },
    };
  }
  return {
    kind: "g2plot",
    plotType: "DualAxes",
    options: {
      data: [lineEnc.data, barEnc.data],
      xField: lineEnc.xField,
      yField: [lineEnc.yField, barEnc.yField],
      geometryOptions: [
        { geometry: "line" },
        {
          geometry: "column",
          isGroup: mode === "group",
          isStack: mode === "stack",
        },
      ],
    },
  };
}

function scatterPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
  multi = false,
): AntvRenderPlan {
  const x = spec.encoding.dimensions[0]?.field ?? "";
  const y = spec.encoding.metrics[0]?.field ?? "";
  const xi = colIndex(columns, x);
  const yi = colIndex(columns, y);
  const seriesField = multi && spec.encoding.metrics.length > 1 ? "series" : undefined;
  const data = rows.map((r) => ({
    x: Number(r[xi] ?? 0),
    y: Number(r[yi] ?? 0),
    ...(seriesField ? { series: String(r[colIndex(columns, spec.encoding.metrics[1]?.field ?? "")] ?? "") } : {}),
  }));
  return {
    kind: "g2plot",
    plotType: "Scatter",
    options: { data, xField: "x", yField: "y", colorField: seriesField },
  };
}

function s2Plan(type: string, vm: ChartViewModel): AntvRenderPlan {
  const spec = chartViewModelToRenderSpec(vm);
  const { rows: capped } = capRows(vm.dataset.rows, ADVANCED_CHART_ROW_CAP);
  return {
    kind: "s2",
    plotType: type,
    options: { rows: capped, columns: vm.dataset.columns, spec },
  };
}

export function buildPlanForType(chartType: string, vm: ChartViewModel): AntvRenderPlan {
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
    case "progress-bar":
    case "bullet-graph":
    case "stock-line":
      return columnPlan(spec, capped, columns, chartType === "bar-range" ? { group: true } : { stack: true });
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
      return { kind: "g2geo", plotType: "choropleth", options: { rows: capped, columns, spec } };
    case "table-info":
    case "table-normal":
    case "table-pivot":
      return s2Plan(chartType, vm);
    case "radar":
      return {
        kind: "g2plot",
        plotType: "Radar",
        options: { data: encodePieRows(spec, capped, columns), xField: "type", yField: "value" },
      };
    case "treemap":
      return {
        kind: "g2plot",
        plotType: "Treemap",
        options: {
          data: encodePieRows(spec, capped, columns).map((d) => ({ name: d.type, value: d.value })),
          colorField: "name",
        },
      };
    case "circle-packing":
      return {
        kind: "g2plot",
        plotType: "CirclePacking",
        options: {
          data: encodePieRows(spec, capped, columns).map((d) => ({ name: d.type, value: d.value })),
          sizeField: "value",
        },
      };
    case "word-cloud":
    case "wordCloud":
      return {
        kind: "g2plot",
        plotType: "WordCloud",
        options: {
          data: encodePieRows(spec, capped, columns).map((d) => ({ word: d.type, weight: d.value })),
          wordField: "word",
          weightField: "weight",
        },
      };
    case "bidirectional-bar":
      return {
        kind: "g2plot",
        plotType: "BidirectionalBar",
        options: { data: encodePieRows(spec, capped, columns) },
      };
    case "waterfall":
      return {
        kind: "g2plot",
        plotType: "Waterfall",
        options: {
          data: encodePieRows(spec, capped, columns).map((d) => ({ type: d.type, value: d.value })),
        },
      };
    default:
      return emptyPlan();
  }
}
