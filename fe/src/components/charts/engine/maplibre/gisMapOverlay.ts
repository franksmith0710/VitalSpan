import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { activeFieldRefs } from "@/lib/chartConfigState";
import { parseMetricValue } from "@/lib/buildChartRenderModel";

export type GisOverlayPoint = {
  lng: number;
  lat: number;
  label?: string;
  value?: number;
  category?: string;
};

export function buildGisOverlayGeoJson(
  config: ChartViewConfig,
  columns: string[],
  rows: (string | number | boolean | null)[][],
): GeoJSON.FeatureCollection | null {
  const dims = activeFieldRefs(config.dimensions);
  const metrics = activeFieldRefs(config.metrics);
  if (dims.length < 2 || rows.length === 0) return null;

  const lngField = dims[0]!.field;
  const latField = dims[1]!.field;
  const lngIdx = columns.indexOf(lngField);
  const latIdx = columns.indexOf(latField);
  if (lngIdx < 0 || latIdx < 0) return null;

  const labelField = dims[2]?.field;
  const labelIdx = labelField ? columns.indexOf(labelField) : -1;
  const metricField = metrics[0]?.field;
  const metricIdx = metricField ? columns.indexOf(metricField) : -1;

  const features = rows
    .map((row, index) => {
      const lng = Number(row[lngIdx]);
      const lat = Number(row[latIdx]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      const labelRaw = labelIdx >= 0 ? row[labelIdx] : undefined;
      const valueRaw = metricIdx >= 0 ? row[metricIdx] : undefined;
      const value = valueRaw == null ? undefined : parseMetricValue(valueRaw) ?? undefined;
      return {
        type: "Feature" as const,
        id: index,
        geometry: { type: "Point" as const, coordinates: [lng, lat] },
        properties: {
          label: labelRaw == null ? undefined : String(labelRaw),
          value,
          category: labelRaw == null ? undefined : String(labelRaw),
        },
      };
    })
    .filter((feature): feature is NonNullable<typeof feature> => feature != null);

  if (!features.length) return null;
  return { type: "FeatureCollection", features };
}
