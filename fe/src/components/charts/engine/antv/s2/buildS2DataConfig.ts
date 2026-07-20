import type { S2DataConfig } from "@antv/s2";
import type { RenderSpec } from "@/components/charts/engine/types";

function rowToRecord(
  row: unknown[],
  columns: string[],
  fields: string[],
): Record<string, string | number> {
  const record: Record<string, string | number> = {};
  for (const field of fields) {
    const index = columns.indexOf(field);
    const raw = index >= 0 ? row[index] : undefined;
    if (typeof raw === "number") {
      record[field] = raw;
    } else if (raw == null) {
      record[field] = "";
    } else {
      record[field] = String(raw);
    }
  }
  return record;
}

export function buildS2DataConfig(input: {
  plotType: string;
  rows: unknown[][];
  columns: string[];
  spec: RenderSpec;
}): S2DataConfig {
  const dimFields = input.spec.encoding.dimensions
    .map((d) => d.field)
    .filter((field): field is string => Boolean(field?.trim()));
  const metricFields = input.spec.encoding.metrics
    .map((m) => m.field)
    .filter((field): field is string => Boolean(field?.trim()));

  const fallbackFields =
    dimFields.length + metricFields.length > 0
      ? [...dimFields, ...metricFields]
      : input.columns;

  const data = input.rows.map((row) =>
    rowToRecord(row, input.columns, fallbackFields),
  );

  const meta = fallbackFields.map((field) => {
    const dim = input.spec.encoding.dimensions.find((d) => d.field === field);
    const metric = input.spec.encoding.metrics.find((m) => m.field === field);
    return {
      field,
      name: dim?.label?.trim() || metric?.label?.trim() || field,
    };
  });

  if (input.plotType === "table-pivot") {
    return {
      fields: {
        rows: dimFields.slice(0, 1),
        columns: dimFields.slice(1, 2),
        values: metricFields.length ? metricFields : fallbackFields.slice(-1),
      },
      meta,
      data,
    };
  }

  return {
    fields: { columns: fallbackFields },
    meta,
    data,
  };
}
