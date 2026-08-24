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

  const points: Array<{
    lng: number;
    lat: number;
    label?: string;
    value?: number;
  }> = [];

  for (const row of rows) {
    const lng = Number(row[lngIdx]);
    const lat = Number(row[latIdx]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const labelRaw = labelIdx >= 0 ? row[labelIdx] : undefined;
    const valueRaw = metricIdx >= 0 ? row[metricIdx] : undefined;
    const value = valueRaw == null ? undefined : parseMetricValue(valueRaw) ?? undefined;
    points.push({
      lng,
      lat,
      label: labelRaw == null ? undefined : String(labelRaw),
      value,
    });
  }

  if (!points.length) return null;

  const metricValues = points
    .map((point) => point.value)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const minValue = metricValues.length ? Math.min(...metricValues) : undefined;
  const maxValue = metricValues.length ? Math.max(...metricValues) : undefined;

  const features = points.map((point, index) => {
    let sizeNorm: number | undefined;
    if (point.value != null && minValue != null && maxValue != null) {
      sizeNorm = maxValue === minValue ? 0.5 : (point.value - minValue) / (maxValue - minValue);
    }
    return {
      type: "Feature" as const,
      id: index,
      geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] },
      properties: {
        label: point.label,
        value: point.value,
        category: point.label,
        sizeNorm,
      },
    };
  });
  return { type: "FeatureCollection", features };
}
