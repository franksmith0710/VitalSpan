import type { RenderSpec } from "@/components/charts/engine/types";
import { safeColIndex } from "@/components/charts/engine/buildDatasetEncoding";

export type AntvPieRow = { type: string; value: number };

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
  return rows.map((r) => ({
    type: String(r[di] ?? ""),
    value: mi !== null ? Number(r[mi] ?? 0) : 0,
  }));
}
