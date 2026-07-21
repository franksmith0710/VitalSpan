import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import { colIndex } from "@/components/charts/engine/buildDatasetEncoding";
import type { RenderSpec } from "@/components/charts/engine/types";

function d3Plan(plotType: string, options: Record<string, unknown>): ChartRenderPlan {
  return { kind: "d3", plotType, options };
}

function emptyPlan(plotType = "Line"): ChartRenderPlan {
  return { kind: "d3", plotType, options: { data: [] }, empty: true };
}

function aggregateDimMetric(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
  pick: (row: unknown[], di: number, indices: number[]) => Record<string, string | number>,
): Record<string, string | number>[] {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const di = colIndex(columns, dim);
  const indices = spec.encoding.metrics.map((m) => colIndex(columns, m.field));
  const map = new Map<string, Record<string, string | number>>();

  for (const row of rows) {
    const key = di >= 0 ? String(row[di] ?? "") : "?";
    const mapped = pick(row, di, indices);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, mapped);
      continue;
    }
    for (const [field, val] of Object.entries(mapped)) {
      if (field === "type") continue;
      if (typeof val === "number") existing[field] = Number(existing[field] ?? 0) + val;
    }
  }
  return [...map.values()];
}

export function barRangePlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const lowField = spec.encoding.metrics[0]?.field ?? "";
  const highField = spec.encoding.metrics[1]?.field ?? lowField;
  const li = colIndex(columns, lowField);
  const hi = colIndex(columns, highField);
  if (li < 0) return emptyPlan("BarRange");

  const data = aggregateDimMetric(spec, rows, columns, (row, di) => ({
    type: di >= 0 ? String(row[di] ?? "") : "?",
    low: Number(row[li] ?? 0),
    high: Number(row[hi >= 0 ? hi : li] ?? 0),
  })).map((row) => ({
    type: String(row.type ?? ""),
    low: Number(row.low ?? 0),
    high: Number(row.high ?? 0),
  }));

  return d3Plan("BarRange", { data });
}

export function progressBarPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const mi = colIndex(columns, metric);
  if (mi < 0) return emptyPlan("ProgressBar");

  const raw = aggregateDimMetric(spec, rows, columns, (row, di, idx) => ({
    type: di >= 0 ? String(row[di] ?? "") : "?",
    value: Number(row[idx[0] ?? -1] ?? 0),
  }));
  const maxVal = Math.max(...raw.map((r) => Number(r.value ?? 0)), 1);
  const data = raw.map((row) => ({
    type: String(row.type ?? ""),
    value: Number(row.value ?? 0),
    max: maxVal,
  }));

  return d3Plan("ProgressBar", { data });
}

export function bulletGraphPlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const metrics = spec.encoding.metrics.map((m) => m.field).filter(Boolean);
  const actualField = metrics[0] ?? "";
  const targetField = metrics[1] ?? metrics[0] ?? "";
  const rangeField = metrics[2];
  const ai = colIndex(columns, actualField);
  const ti = colIndex(columns, targetField);
  const ri = rangeField ? colIndex(columns, rangeField) : -1;
  if (ai < 0) return emptyPlan("Bullet");

  const data = aggregateDimMetric(spec, rows, columns, (row, di) => {
    const actual = Number(row[ai] ?? 0);
    const target = ti >= 0 ? Number(row[ti] ?? 0) : actual;
    const rangeMax = ri >= 0 ? Number(row[ri] ?? 0) : Math.max(actual, target, 1) * 1.2;
    return {
      type: di >= 0 ? String(row[di] ?? "") : "?",
      actual,
      target,
      rangeMax: rangeMax > 0 ? rangeMax : Math.max(actual, target, 1),
    };
  }).map((row) => ({
    type: String(row.type ?? ""),
    actual: Number(row.actual ?? 0),
    target: Number(row.target ?? 0),
    rangeMax: Number(row.rangeMax ?? 1),
  }));

  return d3Plan("Bullet", { data });
}

export function stockLinePlan(
  spec: ReturnType<typeof chartViewModelToRenderSpec>,
  rows: unknown[][],
  columns: string[],
): ChartRenderPlan {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metrics = spec.encoding.metrics.map((m) => m.field).filter(Boolean);
  const di = colIndex(columns, dim);
  const oi = colIndex(columns, metrics[0] ?? "");
  const ci = colIndex(columns, metrics[1] ?? metrics[0] ?? "");
  const li = colIndex(columns, metrics[2] ?? metrics[1] ?? metrics[0] ?? "");
  const hi = colIndex(columns, metrics[3] ?? metrics[2] ?? metrics[1] ?? metrics[0] ?? "");
  if (di < 0 || oi < 0) return emptyPlan("Stock");

  const data = rows.map((row) => {
    const open = Number(row[oi] ?? 0);
    const close = ci >= 0 ? Number(row[ci] ?? 0) : open;
    const low = li >= 0 ? Number(row[li] ?? 0) : Math.min(open, close);
    const high = hi >= 0 ? Number(row[hi] ?? 0) : Math.max(open, close);
    return {
      type: String(row[di] ?? ""),
      open,
      close,
      low: Math.min(low, open, close),
      high: Math.max(high, open, close),
    };
  });

  return d3Plan("Stock", { data });
}
