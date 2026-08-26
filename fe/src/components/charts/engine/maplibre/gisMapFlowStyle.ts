import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import type { GisBasemapFlavor, GisProjectFlow } from "@/components/charts/engine/maplibre/gisProject";
import {
  resolveGisFlowStyle,
  type ResolvedGisFlowStyle,
} from "@/components/charts/engine/maplibre/gisProject";
import { whenGisMapStyleReady } from "@/components/charts/engine/maplibre/gisMapRuntime";

export const GIS_FLOW_LINE_SOURCE_ID = "vs-gis-flow-lines-src";
export const GIS_FLOW_HUB_SOURCE_ID = "vs-gis-flow-hubs-src";
/** @deprecated 单源 + geometry 过滤在 MapLibre 6 下会全灭；保留常量供旧检测逻辑迁移 */
export const GIS_FLOW_SOURCE_ID = GIS_FLOW_LINE_SOURCE_ID;
export const GIS_FLOW_SHADOW_LAYER_ID = "vs-gis-flow-lines-shadow";
export const GIS_FLOW_GLOW_LAYER_ID = "vs-gis-flow-lines-glow";
export const GIS_FLOW_LINE_LAYER_ID = "vs-gis-flow-lines";
export const GIS_FLOW_PULSE_LAYER_ID = "vs-gis-flow-lines-pulse";
export const GIS_FLOW_HUB_LAYER_ID = "vs-gis-flow-hubs";

/** 光晕/轨迹在下、动态彗星与枢纽在最上。 */
const FLOW_LAYER_STACK = [
  GIS_FLOW_SHADOW_LAYER_ID,
  GIS_FLOW_GLOW_LAYER_ID,
  GIS_FLOW_LINE_LAYER_ID,
  GIS_FLOW_PULSE_LAYER_ID,
  GIS_FLOW_HUB_LAYER_ID,
] as const;

type MapLibreMap = import("maplibre-gl").Map;

export type GisFlowLayerOptions = {
  flavor: GisBasemapFlavor;
  flow?: GisProjectFlow;
  chartColors?: string[];
  layersActive?: boolean;
};

/** 线/点分源，避免 geojson-vt 下 geometry-type / $type 过滤全灭（MapLibre #5103）。 */
export function splitFlowGeoJsonByGeometry(
  geoJson: GeoJSON.FeatureCollection | null,
): { lines: GeoJSON.FeatureCollection; hubs: GeoJSON.FeatureCollection } {
  const features = geoJson?.features ?? [];
  return {
    lines: {
      type: "FeatureCollection",
      features: features.filter((feature) => feature.geometry?.type === "LineString"),
    },
    hubs: {
      type: "FeatureCollection",
      features: features.filter((feature) => feature.geometry?.type === "Point"),
    },
  };
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (normalized.length === 3) {
    const r = Number.parseInt(normalized[0]! + normalized[0], 16);
    const g = Number.parseInt(normalized[1]! + normalized[1], 16);
    const b = Number.parseInt(normalized[2]! + normalized[2], 16);
    return [r, g, b];
  }
  if (normalized.length === 6) {
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? [r, g, b] : null;
  }
  return null;
}

function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return `rgba(249, 115, 22, ${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function buildGisFlowLineGradient(color: string): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0,
    rgbaFromHex(color, 0.04),
    0.5,
    rgbaFromHex(color, 0.2),
    1,
    rgbaFromHex(color, 0.04),
  ];
}

/** 动态彗星头部渐变（head/tail 为 0–1 的 line-progress 位置） */
export function buildFlowCometGradient(
  color: string,
  head: number,
  tail: number,
): ExpressionSpecification {
  const h = Math.min(1, Math.max(0, head));
  const t = Math.min(h, Math.max(0, tail));
  const mid = t + (h - t) * 0.55;
  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0,
    rgbaFromHex(color, 0.04),
    t,
    rgbaFromHex(color, 0.12),
    mid,
    rgbaFromHex(color, 0.62),
    h,
    "rgba(255, 255, 255, 0.98)",
    Math.min(1, h + 0.025),
    rgbaFromHex(color, 0.22),
    1,
    rgbaFromHex(color, 0.04),
  ];
}

function buildGisFlowHubPaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "circle-color": ["coalesce", ["get", "color"], resolved.color],
    "circle-opacity": [
      "case",
      ["==", ["get", "hubRole"], "source"],
      resolved.opacity * 0.95,
      resolved.opacity * 0.82,
    ],
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      ["case", ["==", ["get", "hubRole"], "source"], 5.5, 3.2],
      2,
      ["case", ["==", ["get", "hubRole"], "source"], 7, 4],
      4,
      ["case", ["==", ["get", "hubRole"], "source"], 8.5, 4.8],
      6,
      ["case", ["==", ["get", "hubRole"], "source"], 10, 5.5],
    ],
    "circle-blur": ["case", ["==", ["get", "hubRole"], "source"], 0.35, 0.12],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": ["case", ["==", ["get", "hubRole"], "source"], 1.5, 1],
  };
}

function metricWidthExpr(resolved: ResolvedGisFlowStyle): number | ExpressionSpecification {
  if (resolved.scaleByMetric) {
    return [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "weightNorm"], 0.5],
      0,
      resolved.widthMin,
      1,
      resolved.widthMax,
    ];
  }
  return (resolved.widthMin + resolved.widthMax) / 2;
}

const FLOW_LINE_ZOOM_WIDTH_STOPS: Array<[number, number]> = [
  [0, 1.1],
  [1, 1.25],
  [2, 1.4],
  [4, 1.65],
  [6, 1.9],
];

/** MapLibre 6.6 禁止 zoom 插值内再嵌套 `["*", inner, n]` / `["+", inner, n]`，须展平为双层 interpolate。 */
function buildZoomScaledMetricWidth(
  widthMin: number,
  widthMax: number,
  extraPx: number,
): ExpressionSpecification {
  const stops: unknown[] = ["interpolate", ["linear"], ["zoom"]];
  for (const [zoom, factor] of FLOW_LINE_ZOOM_WIDTH_STOPS) {
    stops.push(
      zoom,
      [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "weightNorm"], 0.5],
        0,
        widthMin * factor + extraPx,
        1,
        widthMax * factor + extraPx,
      ],
    );
  }
  return stops as ExpressionSpecification;
}

function buildZoomScaledFixedWidth(base: number, extraPx: number): ExpressionSpecification {
  const stops: unknown[] = ["interpolate", ["linear"], ["zoom"]];
  for (const [zoom, factor] of FLOW_LINE_ZOOM_WIDTH_STOPS) {
    stops.push(zoom, base * factor + extraPx);
  }
  return stops as ExpressionSpecification;
}

export function buildGisFlowLineWidth(
  resolved: ResolvedGisFlowStyle,
  extraPx = 0,
): ExpressionSpecification {
  if (resolved.scaleByMetric) {
    return buildZoomScaledMetricWidth(resolved.widthMin, resolved.widthMax, extraPx);
  }
  const base = metricWidthExpr(resolved);
  if (typeof base === "number") {
    return buildZoomScaledFixedWidth(base, extraPx);
  }
  return buildZoomScaledMetricWidth(resolved.widthMin, resolved.widthMax, extraPx);
}

function buildGisFlowGlowWidth(): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 0, 2.2, 2, 2.6, 4, 3, 6, 3.4];
}

function buildGisFlowShadowWidth(): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 0, 2.8, 2, 3.2, 4, 3.6, 6, 4];
}

function buildGisFlowMainLineWidth(resolved: ResolvedGisFlowStyle): ExpressionSpecification {
  return buildGisFlowLineWidth(resolved, 0);
}

function buildGisFlowLinePaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-gradient": buildGisFlowLineGradient(resolved.color),
    "line-opacity": resolved.opacity,
    "line-width": buildGisFlowMainLineWidth(resolved),
    "line-blur": 0,
  };
}

function buildGisFlowGlowPaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-color": resolved.color,
    "line-opacity": Math.min(0.35, resolved.opacity * 0.28),
    "line-width": buildGisFlowGlowWidth(),
    "line-blur": 1.2,
  };
}

function buildGisFlowShadowPaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-color": resolved.color,
    "line-opacity": Math.min(0.18, resolved.opacity * 0.12),
    "line-width": buildGisFlowShadowWidth(),
    "line-blur": 1.5,
  };
}

function buildGisFlowPulsePaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  const baseWidth = (resolved.widthMin + resolved.widthMax) / 2 + 1.8;
  return {
    "line-gradient": buildFlowCometGradient(resolved.color, 0.12, 0),
    "line-opacity": resolved.animate ? resolved.opacity : 0,
    "line-width": buildZoomScaledFixedWidth(baseWidth, 0),
    "line-blur": 0.45,
    "line-trim-offset": [0, 0.001],
  };
}

/** 写入 style JSON 的安全图层（无嵌套表达式）；完整视觉效果由 runtime sync 叠加。 */
export function buildGisFlowStyleEmbedDefinitions(
  flowGeoJson: GeoJSON.FeatureCollection,
  options: GisFlowLayerOptions,
) {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  const { lines, hubs } = splitFlowGeoJsonByGeometry(flowGeoJson);
  return {
    sources: [
      {
        id: GIS_FLOW_LINE_SOURCE_ID,
        spec: { type: "geojson" as const, data: lines, lineMetrics: true },
      },
      {
        id: GIS_FLOW_HUB_SOURCE_ID,
        spec: { type: "geojson" as const, data: hubs },
      },
    ],
    layers: [
      {
        id: GIS_FLOW_LINE_LAYER_ID,
        type: "line" as const,
        source: GIS_FLOW_LINE_SOURCE_ID,
        layout: { "line-join": "round" as const, "line-cap": "round" as const },
        paint: {
          "line-color": ["coalesce", ["get", "color"], resolved.color],
          "line-opacity": resolved.opacity,
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1.2, 2, 1.5, 4, 1.8, 6, 2.2],
        },
      },
      {
        id: GIS_FLOW_HUB_LAYER_ID,
        type: "circle" as const,
        source: GIS_FLOW_HUB_SOURCE_ID,
        paint: buildGisFlowHubPaint(resolved),
      },
    ] satisfies LayerSpecification[],
  };
}

function markFlowSyncState(map: MapLibreMap, payload: GeoJSON.FeatureCollection, ok: boolean) {
  if (typeof map.getContainer !== "function") return;
  const host = map.getContainer();
  if (!(host instanceof HTMLElement)) return;
  const { lines, hubs } = splitFlowGeoJsonByGeometry(payload);
  host.dataset.flowLineSourceLen = ok ? String(lines.features.length) : "0";
  host.dataset.flowHubSourceLen = ok ? String(hubs.features.length) : "0";
  host.dataset.flowLayerReady = map.getLayer(GIS_FLOW_LINE_LAYER_ID) ? "1" : "0";
}

function ensureGisFlowVisualLayers(map: MapLibreMap, options: GisFlowLayerOptions) {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  const lineLayout = { "line-join": "round" as const, "line-cap": "round" as const };
  const extras: LayerSpecification[] = [
    {
      id: GIS_FLOW_SHADOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowShadowPaint(resolved),
    },
    {
      id: GIS_FLOW_GLOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowGlowPaint(resolved),
    },
    {
      id: GIS_FLOW_PULSE_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowPulsePaint(resolved),
    },
  ];
  for (const layer of extras) {
    if (map.getLayer(layer.id)) continue;
    try {
      map.addLayer(layer);
    } catch {
      // 光晕/脉冲失败不影响主飞线
    }
  }
}

function flowSourcesReady(map: MapLibreMap): boolean {
  return Boolean(map.getSource(GIS_FLOW_LINE_SOURCE_ID) && map.getSource(GIS_FLOW_HUB_SOURCE_ID));
}

function writeFlowGeoJsonSources(
  map: MapLibreMap,
  payload: GeoJSON.FeatureCollection,
): boolean {
  const lineSource = map.getSource(GIS_FLOW_LINE_SOURCE_ID) as
    | import("maplibre-gl").GeoJSONSource
    | undefined;
  const hubSource = map.getSource(GIS_FLOW_HUB_SOURCE_ID) as
    | import("maplibre-gl").GeoJSONSource
    | undefined;
  if (!lineSource || !hubSource) return false;
  const { lines, hubs } = splitFlowGeoJsonByGeometry(payload);
  lineSource.setData(lines);
  hubSource.setData(hubs);
  return true;
}

/** style.setStyle 会重建空源；在 style.load / idle 后显式写入 React 侧 GeoJSON。 */
export function commitGisFlowGeoJsonToMap(
  map: MapLibreMap,
  geoJson: GeoJSON.FeatureCollection | null,
): boolean {
  const payload = geoJson ?? emptyGisFlowGeoJson();
  if (!payload.features.length) return false;
  return writeFlowGeoJsonSources(map, payload);
}

type FlowSyncRequest = {
  payload: GeoJSON.FeatureCollection;
  options?: GisFlowLayerOptions;
};

let latestFlowSyncRequest: FlowSyncRequest | null = null;

function readLatestFlowPayload(): GeoJSON.FeatureCollection {
  return latestFlowSyncRequest?.payload ?? emptyGisFlowGeoJson();
}

function readLatestFlowOptions(): GisFlowLayerOptions | undefined {
  return latestFlowSyncRequest?.options;
}

function scheduleFlowGeoJsonCommit(map: MapLibreMap, generation: number) {
  let attempts = 0;
  const maxAttempts = 4;
  const tryCommit = (): boolean => {
    if (generation !== gisFlowDataSyncGeneration) return true;
    const payload = readLatestFlowPayload();
    const options = readLatestFlowOptions();
    if (!writeFlowGeoJsonSources(map, payload)) {
      markFlowSyncState(map, payload, false);
      return false;
    }
    if (options && shouldAppendGisFlowLayers(options)) {
      ensureGisFlowVisualLayers(map, options);
    }
    moveFlowLayersToTop(map);
    markFlowSyncState(map, payload, true);
    return true;
  };
  const retry = () => {
    if (generation !== gisFlowDataSyncGeneration) return;
    if (tryCommit()) return;
    attempts += 1;
    if (attempts >= maxAttempts) return;
    map.once("idle", retry);
  };
  if (tryCommit()) return;
  map.once("idle", retry);
}

function mountGisFlowStack(
  map: MapLibreMap,
  payload: GeoJSON.FeatureCollection,
  options: GisFlowLayerOptions,
): boolean {
  try {
    const { sources, layers } = buildGisFlowLayerDefinitions(payload, options);
    for (const source of sources) {
      if (!map.getSource(source.id)) {
        map.addSource(source.id, source.spec);
      }
    }
    for (const layer of layers) {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    }
    if (!map.getLayer(GIS_FLOW_LINE_LAYER_ID)) return false;
    writeFlowGeoJsonSources(map, payload);
    ensureGisFlowVisualLayers(map, options);
    moveFlowLayersToTop(map);
    return true;
  } catch {
    return false;
  }
}

export function buildGisFlowLayerDefinitions(
  flowGeoJson: GeoJSON.FeatureCollection,
  options: GisFlowLayerOptions,
) {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  const lineLayout = {
    "line-join": "round" as const,
    "line-cap": "round" as const,
  };
  const { lines, hubs } = splitFlowGeoJsonByGeometry(flowGeoJson);
  const layers: LayerSpecification[] = [
    {
      id: GIS_FLOW_SHADOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowShadowPaint(resolved),
    },
    {
      id: GIS_FLOW_GLOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowGlowPaint(resolved),
    },
    {
      id: GIS_FLOW_LINE_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowLinePaint(resolved),
    },
    {
      id: GIS_FLOW_PULSE_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowPulsePaint(resolved),
    },
    {
      id: GIS_FLOW_HUB_LAYER_ID,
      type: "circle",
      source: GIS_FLOW_HUB_SOURCE_ID,
      paint: buildGisFlowHubPaint(resolved),
    },
  ];
  return {
    sources: [
      {
        id: GIS_FLOW_LINE_SOURCE_ID,
        spec: { type: "geojson" as const, data: lines, lineMetrics: true },
      },
      {
        id: GIS_FLOW_HUB_SOURCE_ID,
        spec: { type: "geojson" as const, data: hubs },
      },
    ],
    layers,
  };
}

export function emptyGisFlowGeoJson(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function moveFlowLayersToTop(map: MapLibreMap) {
  for (const layerId of FLOW_LAYER_STACK) {
    if (typeof map.getLayer === "function" && map.getLayer(layerId)) map.moveLayer(layerId);
  }
}

let gisFlowDataSyncGeneration = 0;

/** @internal vitest only */
export function resetGisFlowDataSyncGenerationForTests() {
  gisFlowDataSyncGeneration = 0;
  latestFlowSyncRequest = null;
}

export function syncGisFlowData(
  map: MapLibreMap,
  geoJson: GeoJSON.FeatureCollection | null,
  options?: GisFlowLayerOptions,
) {
  latestFlowSyncRequest = {
    payload: geoJson ?? emptyGisFlowGeoJson(),
    options,
  };
  const generation = ++gisFlowDataSyncGeneration;
  const ensureLayers = () => {
    const layerOptions = readLatestFlowOptions();
    const payload = readLatestFlowPayload();
    if (!layerOptions || !shouldAppendGisFlowLayers(layerOptions)) return;
    const lineLayerReady = Boolean(map.getLayer(GIS_FLOW_LINE_LAYER_ID));
    if (flowSourcesReady(map) && lineLayerReady) return;
    mountGisFlowStack(map, payload, layerOptions);
  };
  const apply = () => {
    if (generation !== gisFlowDataSyncGeneration) return;
    ensureLayers();
    scheduleFlowGeoJsonCommit(map, generation);
  };
  if (map.isStyleLoaded()) {
    apply();
    return;
  }
  whenGisMapStyleReady(map, apply);
}

function syncGisFlowLinePaint(map: MapLibreMap, options: GisFlowLayerOptions) {
  if (!map.getLayer(GIS_FLOW_LINE_LAYER_ID)) return;
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  const mainLinePaint = buildGisFlowLinePaint(resolved);
  const effectPaintByLayer: Record<string, Record<string, unknown>> = {
    [GIS_FLOW_SHADOW_LAYER_ID]: buildGisFlowShadowPaint(resolved),
    [GIS_FLOW_GLOW_LAYER_ID]: buildGisFlowGlowPaint(resolved),
    [GIS_FLOW_PULSE_LAYER_ID]: buildGisFlowPulsePaint(resolved),
  };
  for (const [layerId, paint] of Object.entries(effectPaintByLayer)) {
    if (!map.getLayer(layerId)) continue;
    for (const [key, value] of Object.entries(paint)) {
      try {
        map.setPaintProperty(layerId, key, value);
      } catch {
        // 光晕层失败不影响主飞线
      }
    }
  }
  try {
    map.setPaintProperty(GIS_FLOW_LINE_LAYER_ID, "line-color", undefined);
  } catch {
    // 主线改用 line-gradient
  }
  for (const [key, value] of Object.entries(mainLinePaint)) {
    try {
      map.setPaintProperty(GIS_FLOW_LINE_LAYER_ID, key, value);
    } catch {
      // 主飞线样式失败不阻断
    }
  }
  if (map.getLayer(GIS_FLOW_HUB_LAYER_ID)) {
    const hubPaint = buildGisFlowHubPaint(resolved);
    for (const [key, value] of Object.entries(hubPaint)) {
      try {
        map.setPaintProperty(GIS_FLOW_HUB_LAYER_ID, key, value);
      } catch {
        // ignore
      }
    }
  }
}

export function syncGisFlowStyle(map: MapLibreMap, options: GisFlowLayerOptions) {
  whenGisMapStyleReady(map, () => {
    if (!map.getLayer(GIS_FLOW_LINE_LAYER_ID)) return;
    ensureGisFlowVisualLayers(map, options);
    syncGisFlowLinePaint(map, options);
    moveFlowLayersToTop(map);
  });
}

export function buildGisFlowStyleKey(options: GisFlowLayerOptions): string {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  return JSON.stringify({
    enabled: resolved.enabled,
    color: resolved.color,
    widthMin: resolved.widthMin,
    widthMax: resolved.widthMax,
    opacity: resolved.opacity,
    scaleByMetric: resolved.scaleByMetric,
    animate: resolved.animate,
    flavor: options.flavor,
    layersActive: options.layersActive === true,
  });
}

export function shouldAppendGisFlowLayers(options: GisFlowLayerOptions): boolean {
  if (options.layersActive) return true;
  return resolveGisFlowStyle(options.flow, options.chartColors).enabled;
}
