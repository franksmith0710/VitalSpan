import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { activeFieldRefs } from "@/lib/chartConfigState";
import { parseMetricValue } from "@/lib/buildChartRenderModel";
import { isGisFlowEnabled } from "@/components/charts/engine/maplibre/gisProject";
import { migrateChartConfigToDeAxes, syncLegacyFieldsFromAxes } from "@/lib/resolveChartEncoding";

/** 从 DE 轴投影读取 OD 槽位，避免 axes/dimensions 漂移时 hint/渲染读错列 */
export function resolveGisMapFlowDimensions(config: ChartViewConfig) {
  return activeFieldRefs(
    syncLegacyFieldsFromAxes(migrateChartConfigToDeAxes(config)).dimensions,
  );
}

export type GisFlowSegment = {
  fromLng: number;
  fromLat: number;
  toLng: number;
  toLat: number;
  label?: string;
  weight?: number;
};

const DEFAULT_FLOW_COLOR = "#38bdf8";

const ARC_SEGMENTS = 48;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function toDeg(value: number): number {
  return (value * 180) / Math.PI;
}

/** 大圆路径插值（全球 OD 弧线） */
export function interpolateGreatCircleArc(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = ARC_SEGMENTS,
): [number, number][] {
  const lat1 = toRad(fromLat);
  const lon1 = toRad(fromLng);
  const lat2 = toRad(toLat);
  const lon2 = toRad(toLng);
  const delta =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat1 - lat2) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon1 - lon2) / 2) ** 2,
      ),
    );
  if (!Number.isFinite(delta) || delta < 1e-10) {
    return [
      [fromLng, fromLat],
      [toLng, toLat],
    ];
  }
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const f = i / segments;
    const a = Math.sin((1 - f) * delta) / Math.sin(delta);
    const b = Math.sin(f * delta) / Math.sin(delta);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    coords.push([toDeg(Math.atan2(y, x)), toDeg(Math.asin(z))]);
  }
  return coords;
}

export function buildGisFlowGeoJson(
  config: ChartViewConfig,
  columns: string[],
  rows: (string | number | boolean | null)[][],
  chartColors?: string[],
): GeoJSON.FeatureCollection | null {
  if (!isGisFlowEnabled(config.nativeBody?.gisProject)) return null;

  const dims = resolveGisMapFlowDimensions(config);
  const metrics = activeFieldRefs(
    syncLegacyFieldsFromAxes(migrateChartConfigToDeAxes(config)).metrics,
  );
  if (dims.length < 4 || rows.length === 0) return null;

  const fromLngField = dims[0]!.field;
  const fromLatField = dims[1]!.field;
  const toLngField = dims[2]!.field;
  const toLatField = dims[3]!.field;
  const fromLngIdx = columns.indexOf(fromLngField);
  const fromLatIdx = columns.indexOf(fromLatField);
  const toLngIdx = columns.indexOf(toLngField);
  const toLatIdx = columns.indexOf(toLatField);
  if (fromLngIdx < 0 || fromLatIdx < 0 || toLngIdx < 0 || toLatIdx < 0) return null;

  const labelField = dims[4]?.field;
  const labelIdx = labelField ? columns.indexOf(labelField) : -1;
  const metricField = metrics[0]?.field;
  const metricIdx = metricField ? columns.indexOf(metricField) : -1;

  const segments: GisFlowSegment[] = [];
  for (const row of rows) {
    const fromLng = Number(row[fromLngIdx]);
    const fromLat = Number(row[fromLatIdx]);
    const toLng = Number(row[toLngIdx]);
    const toLat = Number(row[toLatIdx]);
    if (
      !Number.isFinite(fromLng) ||
      !Number.isFinite(fromLat) ||
      !Number.isFinite(toLng) ||
      !Number.isFinite(toLat)
    ) {
      continue;
    }
    const labelRaw = labelIdx >= 0 ? row[labelIdx] : undefined;
    const weightRaw = metricIdx >= 0 ? row[metricIdx] : undefined;
    segments.push({
      fromLng,
      fromLat,
      toLng,
      toLat,
      label: labelRaw == null ? undefined : String(labelRaw),
      weight: weightRaw == null ? undefined : parseMetricValue(weightRaw) ?? undefined,
    });
  }
  if (!segments.length) return null;

  const weights = segments
    .map((segment) => segment.weight)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const minWeight = weights.length ? Math.min(...weights) : undefined;
  const maxWeight = weights.length ? Math.max(...weights) : undefined;
  const fallbackColor = chartColors?.[0] ?? DEFAULT_FLOW_COLOR;

  const features = segments.map((segment, index) => {
    let weightNorm: number | undefined;
    if (segment.weight != null && minWeight != null && maxWeight != null) {
      weightNorm = maxWeight === minWeight ? 0.5 : (segment.weight - minWeight) / (maxWeight - minWeight);
    }
    return {
      type: "Feature" as const,
      id: index,
      geometry: {
        type: "LineString" as const,
        coordinates: interpolateGreatCircleArc(
          segment.fromLng,
          segment.fromLat,
          segment.toLng,
          segment.toLat,
        ),
      },
      properties: {
        label: segment.label,
        weight: segment.weight,
        weightNorm,
        color: fallbackColor,
      },
    };
  });

  return { type: "FeatureCollection", features };
}

export function gisFlowFieldsReady(config: ChartViewConfig): boolean {
  if (!isGisFlowEnabled(config.nativeBody?.gisProject)) return false;
  const dims = resolveGisMapFlowDimensions(config);
  return Boolean(
    dims[0]?.field?.trim() &&
      dims[1]?.field?.trim() &&
      dims[2]?.field?.trim() &&
      dims[3]?.field?.trim(),
  );
}
