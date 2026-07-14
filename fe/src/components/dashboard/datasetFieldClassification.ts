export type DatasetFieldKind = "dimension" | "metric";

/** 可聚合的数值型业务度量（对标 DataEase 指标） */
const METRIC_PATTERN =
  /(?:^|_)(amount|amt|count|cnt|qty|quantity|price|total|sum|avg|rate|score|记录数)(?:$|_)/i;

/** 时间、地域、名称、标识类维度 */
const DIMENSION_PATTERN =
  /(?:^|_)(date|time|day|month|year|week|region|area|city|province|country|product|category|channel|name|type|status|label|dim|code)(?:$|_)|^id$|_id$/i;

export function classifyDatasetField(field: string): DatasetFieldKind {
  const normalized = field.trim();
  if (!normalized) return "dimension";
  if (normalized === "记录数" || normalized.endsWith("*")) return "metric";
  if (DIMENSION_PATTERN.test(normalized)) return "dimension";
  if (METRIC_PATTERN.test(normalized)) return "metric";
  return "dimension";
}

export function groupDatasetFields(fields: string[]): {
  dimensions: string[];
  metrics: string[];
} {
  const dimensions: string[] = [];
  const metrics: string[] = [];
  for (const field of fields) {
    if (classifyDatasetField(field) === "metric") {
      metrics.push(field);
    } else {
      dimensions.push(field);
    }
  }
  return { dimensions, metrics };
}

export function fieldDisplayKind(field: string): "date" | "text" | "number" {
  const kind = classifyDatasetField(field);
  if (kind === "metric") return "number";
  if (/(?:^|_)(date|time|day|month|year|week)(?:$|_)/i.test(field)) return "date";
  return "text";
}
