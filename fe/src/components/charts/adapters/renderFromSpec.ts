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

function colIndex(columns: string[], field: string): number {
  return columns.indexOf(field);
}

export function capRows<T>(rows: T[], cap: number): { rows: T[]; truncated: boolean } {
  if (rows.length <= cap) return { rows, truncated: false };
  return { rows: rows.slice(0, cap), truncated: true };
}

function buildFunnelOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const di = colIndex(columns, dim);
  const mi = colIndex(columns, metric);
  const data = rows.map((r) => ({ name: String(r[di] ?? ""), value: Number(r[mi] ?? 0) }));
  return { series: [{ type: "funnel", sort: "descending", data }] };
}

function buildSankeyOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
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

function buildGaugeOption(spec: RenderSpec, rows: unknown[][], columns: string[]): EChartsOption {
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const mi = colIndex(columns, metric);
  const value = rows.length ? Number(rows[0][mi] ?? 0) : 0;
  return { series: [{ type: "gauge", data: [{ value }] }] };
}

export function buildEchartsOption(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
): EChartsOption {
  const { rows: capped } = capRows(rows, ADVANCED_CHART_ROW_CAP);
  switch (spec.chartType) {
    case "funnel":
      return buildFunnelOption(spec, capped, columns);
    case "sankey":
      return buildSankeyOption(spec, capped, columns);
    case "graph":
      return buildGraphOption(spec, capped, columns);
    case "map":
      return buildMapOption(spec, capped, columns);
    case "gauge":
      return buildGaugeOption(spec, capped, columns);
    default:
      return { series: [{ type: "bar", data: [] }] };
  }
}
