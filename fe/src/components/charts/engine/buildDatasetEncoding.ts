import type { ChartFieldRef } from "@/lib/chartViewConfig";
import type { RenderSpec } from "@/components/charts/engine/types";
import { DE_AREA_FILL_OPACITY } from "@/components/charts/engine/presentationConstants";

export const ADVANCED_CHART_ROW_CAP = 500;
export const GRAPH_NODE_CAP = 200;
export const SANKEY_LINK_CAP = 300;

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

export function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export type CartesianSeriesBuild = {
  xData: string[];
  series: Array<{ name?: string; type?: string; data?: unknown[] }>;
  isHorizontal: boolean;
};

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

/** 类别轴 + 可选子类别拆系列 + 指标聚合（引擎无关） */
export function buildCartesianCategorySeries(
  spec: Pick<RenderSpec, "encoding" | "styleVariant">,
  rows: unknown[][],
  columns: string[],
  seriesType: "line" | "bar",
  stylePatch?: (styleVariant: string) => Record<string, unknown>,
): CartesianSeriesBuild {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const subDim = spec.encoding.dimensions[1]?.field;
  const metrics = spec.encoding.metrics.map((m: ChartFieldRef) => m.field).filter(Boolean);
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
      if (
        seriesType === "bar" &&
        (spec.styleVariant === "stacked" || spec.styleVariant === "grouped")
      ) {
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

export function resolveSeriesLegendNames(
  spec: Pick<RenderSpec, "chartType" | "encoding" | "styleVariant">,
  rows: unknown[][],
  columns: string[],
): string[] {
  const { chartType, encoding } = spec;
  if (chartType === "pie" || chartType === "funnel") {
    const dim = encoding.dimensions[0]?.field ?? "";
    const di = safeColIndex(columns, dim);
    if (di === null) return [];
    return uniqueOrdered(rows.map((r) => String(r[di] ?? "")).filter(Boolean));
  }
  if (chartType === "line" || chartType === "bar") {
    const { series } = buildCartesianCategorySeries(
      spec,
      rows,
      columns,
      chartType === "line" ? "line" : "bar",
    );
    return series.map((s) => String(s.name ?? "")).filter(Boolean);
  }
  if (chartType === "timeline") {
    const metric = encoding.metrics[0]?.field;
    return metric ? [metric] : [];
  }
  return [];
}

export { colIndex };
