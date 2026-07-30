import type { DeAxisId } from "@/lib/chartDeAxis";
import type { RenderSpec } from "@/components/charts/engine/types";
import { colIndex } from "@/components/charts/engine/buildDatasetEncoding";
import { classifyDatasetField } from "@/components/dashboard/datasetFieldClassification";

/** buildPlan：优先读 DE 命名轴，回退 legacy dimensions/metrics 投影 */
export function fieldFromAxisOrLegacy(
  spec: RenderSpec,
  axisId: DeAxisId,
  index: number,
  legacyKind: "dimension" | "metric",
  legacyIndex: number,
): string {
  const fromAxis = spec.encoding.axes?.[axisId]?.[index]?.field?.trim();
  if (fromAxis) return fromAxis;
  if (legacyKind === "dimension") {
    return spec.encoding.dimensions[legacyIndex]?.field?.trim() ?? "";
  }
  return spec.encoding.metrics[legacyIndex]?.field?.trim() ?? "";
}

const DATE_LIKE = /(?:^|_)(date|time|day|month|year|week|timestamp|datetime)(?:$|_)|_at$/i;

/** 区间图等：指标取数值；时间维度取时间戳 */
export function coerceAxisNumeric(row: unknown[], columns: string[], field: string): number {
  if (!field) return 0;
  const idx = colIndex(columns, field);
  if (idx < 0) return 0;
  const raw = row[idx];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw ?? "").trim();
  if (!text) return 0;
  const asNum = Number(text.replace(/,/g, ""));
  if (Number.isFinite(asNum) && (classifyDatasetField(field) === "metric" || !DATE_LIKE.test(field))) {
    return asNum;
  }
  const ts = Date.parse(text);
  return Number.isFinite(ts) ? ts : asNum || 0;
}
