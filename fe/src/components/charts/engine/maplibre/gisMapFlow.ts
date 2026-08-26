import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { activeFieldRefs } from "@/lib/chartConfigState";
import { parseMetricValue } from "@/lib/buildChartRenderModel";
import { isGisFlowEnabled, resolveGisFlowStyle } from "@/components/charts/engine/maplibre/gisProject";
import { migrateChartConfigToDeAxes, syncLegacyFieldsFromAxes } from "@/lib/resolveChartEncoding";
import { interpolateElevatedFlowArc } from "@/components/charts/engine/maplibre/gisMapFlowArc";

export { interpolateGreatCircleArc } from "@/components/charts/engine/maplibre/gisMapFlowArc";

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
const DEST_HUB_COLOR = "#fb7185";

const ARC_SEGMENTS = 80;

function gisOdCoordinatesReady(config: ChartViewConfig): boolean {
  const dims = resolveGisMapFlowDimensions(config);
  return Boolean(
    dims[0]?.field?.trim() &&
      dims[1]?.field?.trim() &&
      dims[2]?.field?.trim() &&
      dims[3]?.field?.trim(),
  );
}

export function flowHubKey(lng: number, lat: number): string {
  return `${lng.toFixed(4)}:${lat.toFixed(4)}`;
}

/** 跨日界线时 MapLibre 会把 LineString 画成横穿全屏的错线，须拆段。 */
export function splitLineAtAntimeridian(coords: [number, number][]): [number, number][][] {
  if (coords.length < 2) return coords.length ? [coords] : [];
  const segments: [number, number][][] = [];
  let current: [number, number][] = [coords[0]!];
  for (let i = 1; i < coords.length; i += 1) {
    const prev = current[current.length - 1]!;
    const next = coords[i]!;
    if (Math.abs(next[0] - prev[0]) > 180) {
      if (current.length >= 2) segments.push(current);
      current = [next];
      continue;
    }
    current.push(next);
  }
  if (current.length >= 2) segments.push(current);
  return segments.length ? segments : [coords];
}

function buildFlowLineFeatures(
  segment: GisFlowSegment,
  index: number,
  fallbackColor: string,
  weightNorm: number | undefined,
  arcLift: number,
): GeoJSON.Feature[] {
  const arcCoords = interpolateElevatedFlowArc(
    segment.fromLng,
    segment.fromLat,
    segment.toLng,
    segment.toLat,
    ARC_SEGMENTS,
    arcLift,
  );
  const arcs = splitLineAtAntimeridian(arcCoords);
  return arcs.map((coordinates, arcIndex) => ({
    type: "Feature" as const,
    id: `flow-${index}-${arcIndex}`,
    geometry: { type: "LineString" as const, coordinates },
    properties: {
      label: segment.label,
      weight: segment.weight,
      weightNorm,
      color: fallbackColor,
      role: "arc",
      flowIndex: index,
      flowPhase: (index * 0.17) % 1,
    },
  }));
}

function upsertFlowHub(
  hubMap: Map<string, GeoJSON.Feature>,
  lng: number,
  lat: number,
  role: "source" | "dest",
  color: string,
  outbound?: number,
): void {
  const key = flowHubKey(lng, lat);
  const existing = hubMap.get(key);
  if (!existing) {
    hubMap.set(key, {
      type: "Feature",
      id: `hub-${role}-${key}`,
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        color,
        hubRole: role,
        ...(role === "source" ? { outbound: outbound ?? 1 } : {}),
      },
    });
    return;
  }
  if (role === "source") {
    existing.properties = {
      ...existing.properties,
      hubRole: "source",
      color,
      outbound: Math.max(Number(existing.properties?.outbound ?? 0), outbound ?? 1),
    };
  }
}

export function buildGisFlowGeoJson(
  config: ChartViewConfig,
  columns: string[],
  rows: (string | number | boolean | null)[][],
  chartColors?: string[],
): GeoJSON.FeatureCollection | null {
  if (!gisOdCoordinatesReady(config)) return null;

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
    const fromLng = parseMetricValue(row[fromLngIdx]);
    const fromLat = parseMetricValue(row[fromLatIdx]);
    const toLng = parseMetricValue(row[toLngIdx]);
    const toLat = parseMetricValue(row[toLatIdx]);
    if (fromLng == null || fromLat == null || toLng == null || toLat == null) {
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

  const sourceOutbound = new Map<string, number>();
  for (const segment of segments) {
    const key = flowHubKey(segment.fromLng, segment.fromLat);
    sourceOutbound.set(key, (sourceOutbound.get(key) ?? 0) + 1);
  }

  const weights = segments
    .map((segment) => segment.weight)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const minWeight = weights.length ? Math.min(...weights) : undefined;
  const maxWeight = weights.length ? Math.max(...weights) : undefined;
  const fallbackColor = chartColors?.[0] ?? DEFAULT_FLOW_COLOR;
  const arcLift = resolveGisFlowStyle(config.nativeBody?.gisProject, chartColors).arcLift;

  const hubMap = new Map<string, GeoJSON.Feature>();
  const lineFeatures: GeoJSON.Feature[] = [];

  segments.forEach((segment, index) => {
    let weightNorm: number | undefined;
    if (segment.weight != null && minWeight != null && maxWeight != null) {
      weightNorm = maxWeight === minWeight ? 0.5 : (segment.weight - minWeight) / (maxWeight - minWeight);
    }
    lineFeatures.push(
      ...buildFlowLineFeatures(segment, index, fallbackColor, weightNorm, arcLift),
    );
    const sourceKey = flowHubKey(segment.fromLng, segment.fromLat);
    upsertFlowHub(
      hubMap,
      segment.fromLng,
      segment.fromLat,
      "source",
      fallbackColor,
      sourceOutbound.get(sourceKey),
    );
    upsertFlowHub(hubMap, segment.toLng, segment.toLat, "dest", DEST_HUB_COLOR);
  });

  return {
    type: "FeatureCollection",
    features: [...lineFeatures, ...hubMap.values()],
  };
}

export function gisFlowFieldsReady(config: ChartViewConfig): boolean {
  if (!gisOdCoordinatesReady(config)) return false;
  return isGisFlowEnabled(config.nativeBody?.gisProject) || gisOdCoordinatesReady(config);
}
