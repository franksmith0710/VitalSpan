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
    rgbaFromHex(color, 0.2),
    0.38,
    rgbaFromHex(color, 0.72),
    0.5,
    "rgba(255, 255, 255, 0.98)",
    0.62,
    rgbaFromHex(color, 0.72),
    1,
    rgbaFromHex(color, 0.2),
  ];
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
  [0, 2.8],
  [1, 3.4],
  [2, 4.2],
  [4, 5.2],
  [6, 6],
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

function buildGisFlowGlowWidth(_lineWidth: ExpressionSpecification): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 0, 14, 1, 18, 2, 22, 4, 28, 6, 34];
}

function buildGisFlowShadowWidth(_lineWidth: ExpressionSpecification): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 0, 18, 1, 24, 2, 30, 4, 38, 6, 46];
}

function buildGisFlowLinePaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-color": ["coalesce", ["get", "color"], resolved.color],
    "line-opacity": resolved.opacity,
    "line-width": buildGisFlowLineWidth(resolved),
    "line-blur": 0.15,
  };
}

function buildGisFlowGlowPaint(
  resolved: ResolvedGisFlowStyle,
  lineWidth: ExpressionSpecification,
): Record<string, unknown> {
  return {
    "line-color": resolved.color,
    "line-opacity": Math.min(1, resolved.opacity * 0.5),
    "line-width": buildGisFlowGlowWidth(lineWidth),
    "line-blur": 3,
  };
}

function buildGisFlowShadowPaint(
  resolved: ResolvedGisFlowStyle,
  lineWidth: ExpressionSpecification,
): Record<string, unknown> {
  return {
    "line-color": "#0f172a",
    "line-opacity": Math.min(0.55, resolved.opacity * 0.35),
    "line-width": buildGisFlowShadowWidth(lineWidth),
    "line-blur": 4,
  };
}

function buildGisFlowPulsePaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-color": "#ffffff",
    "line-opacity": resolved.opacity * 0.55,
    "line-width": ["interpolate", ["linear"], ["zoom"], 0, 10, 2, 14, 4, 18, 6, 22],
    "line-blur": 0.35,
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
        spec: { type: "geojson" as const, data: lines },
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
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 8, 2, 12, 4, 16, 6, 20],
        },
      },
      {
        id: GIS_FLOW_HUB_LAYER_ID,
        type: "circle" as const,
        source: GIS_FLOW_HUB_SOURCE_ID,
        paint: {
          "circle-color": ["coalesce", ["get", "color"], resolved.color],
          "circle-opacity": resolved.opacity,
          "circle-radius": 6,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      },
    ] satisfies LayerSpecification[],
  };
}

function markFlowSyncState(map: MapLibreMap, payload: GeoJSON.FeatureCollection, ok: boolean) {
  if (typeof map.getContainer !== "function") return;
  const host = map.getContainer();
  if (!(host instanceof HTMLElement)) return;
  host.dataset.flowSourceLen = ok ? String(payload.features.length) : "0";
  host.dataset.flowLayerReady = map.getLayer(GIS_FLOW_LINE_LAYER_ID) ? "1" : "0";
}

function ensureGisFlowVisualLayers(map: MapLibreMap, options: GisFlowLayerOptions) {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  const lineWidth = buildGisFlowLineWidth(resolved);
  const lineLayout = { "line-join": "round" as const, "line-cap": "round" as const };
  const extras: LayerSpecification[] = [
    {
      id: GIS_FLOW_SHADOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowShadowPaint(resolved, lineWidth),
    },
    {
      id: GIS_FLOW_GLOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowGlowPaint(resolved, lineWidth),
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

function mountGisFlowStack(
  map: MapLibreMap,
  payload: GeoJSON.FeatureCollection,
  options: GisFlowLayerOptions,
): boolean {
  try {
    const embed = buildGisFlowStyleEmbedDefinitions(payload, options);
    for (const source of embed.sources) {
      if (!map.getSource(source.id)) {
        map.addSource(source.id, source.spec);
      }
    }
    for (const layer of embed.layers) {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    }
    if (!map.getLayer(GIS_FLOW_LINE_LAYER_ID)) return false;
    writeFlowGeoJsonSources(map, payload);
    ensureGisFlowVisualLayers(map, options);
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
  const lineWidth = buildGisFlowLineWidth(resolved);
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
      paint: buildGisFlowShadowPaint(resolved, lineWidth),
    },
    {
      id: GIS_FLOW_GLOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_LINE_SOURCE_ID,
      layout: lineLayout,
      paint: buildGisFlowGlowPaint(resolved, lineWidth),
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
      paint: {
        "circle-color": ["coalesce", ["get", "color"], resolved.color],
        "circle-opacity": resolved.opacity,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 2, 6, 4, 8, 6, 10],
        "circle-blur": 0.25,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
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
}

export function syncGisFlowData(
  map: MapLibreMap,
  geoJson: GeoJSON.FeatureCollection | null,
  options?: GisFlowLayerOptions,
) {
  const generation = ++gisFlowDataSyncGeneration;
  const payload = geoJson ?? emptyGisFlowGeoJson();
  const ensureLayers = () => {
    if (!options || !shouldAppendGisFlowLayers(options)) return;
    const lineLayerReady = Boolean(map.getLayer(GIS_FLOW_LINE_LAYER_ID));
    if (flowSourcesReady(map) && lineLayerReady) return;
    mountGisFlowStack(map, payload, options);
  };
  const apply = () => {
    if (generation !== gisFlowDataSyncGeneration) return;
    ensureLayers();
    const writeData = () => {
      if (generation !== gisFlowDataSyncGeneration) return false;
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
    if (writeData()) return;
    map.once("idle", () => {
      if (writeData()) return;
      map.once("idle", writeData);
    });
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
  const lineWidth = buildGisFlowLineWidth(resolved);
  const paintByLayer: Record<string, Record<string, unknown>> = {
    [GIS_FLOW_SHADOW_LAYER_ID]: buildGisFlowShadowPaint(resolved, lineWidth),
    [GIS_FLOW_GLOW_LAYER_ID]: buildGisFlowGlowPaint(resolved, lineWidth),
    [GIS_FLOW_LINE_LAYER_ID]: buildGisFlowLinePaint(resolved),
    [GIS_FLOW_PULSE_LAYER_ID]: buildGisFlowPulsePaint(resolved),
  };
  for (const [layerId, paint] of Object.entries(paintByLayer)) {
    if (!map.getLayer(layerId)) continue;
    for (const [key, value] of Object.entries(paint)) {
      try {
        map.setPaintProperty(layerId, key, value);
      } catch {
        // 单层样式失败不阻断主飞线
      }
    }
  }
  if (map.getLayer(GIS_FLOW_HUB_LAYER_ID)) {
    try {
      map.setPaintProperty(GIS_FLOW_HUB_LAYER_ID, "circle-color", [
        "coalesce",
        ["get", "color"],
        resolved.color,
      ]);
      map.setPaintProperty(GIS_FLOW_HUB_LAYER_ID, "circle-opacity", resolved.opacity);
    } catch {
      // ignore
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
