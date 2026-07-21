import type { RenderSpec } from "@/components/charts/engine/types";
import { safeColIndex } from "@/components/charts/engine/buildDatasetEncoding";

export type AntvPieRow = { type: string; value: number };

/** 按维度聚合指标（与笛卡尔图 sumAt 语义一致） */
export function encodePieRows(
  spec: RenderSpec,
  rows: unknown[][],
  columns: string[],
): AntvPieRow[] {
  const dim = spec.encoding.dimensions[0]?.field ?? "";
  const metric = spec.encoding.metrics[0]?.field ?? "";
  const di = safeColIndex(columns, dim);
  const mi = safeColIndex(columns, metric);
  if (di === null || mi === null) return [];

  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[di] ?? "");
    totals.set(key, (totals.get(key) ?? 0) + Number(row[mi] ?? 0));
  }
  return [...totals.entries()].map(([type, value]) => ({ type, value }));
}
