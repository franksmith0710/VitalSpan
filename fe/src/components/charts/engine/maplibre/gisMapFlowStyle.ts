import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import type { GisBasemapFlavor, GisProjectFlow } from "@/components/charts/engine/maplibre/gisProject";
import {
  resolveGisFlowStyle,
  type ResolvedGisFlowStyle,
} from "@/components/charts/engine/maplibre/gisProject";
import { whenGisMapStyleReady } from "@/components/charts/engine/maplibre/gisMapRuntime";

export const GIS_FLOW_SOURCE_ID = "vs-gis-flow";
export const GIS_FLOW_SHADOW_LAYER_ID = "vs-gis-flow-lines-shadow";
export const GIS_FLOW_GLOW_LAYER_ID = "vs-gis-flow-lines-glow";
export const GIS_FLOW_LINE_LAYER_ID = "vs-gis-flow-lines";
export const GIS_FLOW_PULSE_LAYER_ID = "vs-gis-flow-lines-pulse";
export const GIS_FLOW_HUB_LAYER_ID = "vs-gis-flow-hubs";

const GIS_FLOW_LINE_FILTER = ["==", ["geometry-type"], "LineString"] as const;
const GIS_FLOW_HUB_FILTER = ["==", ["geometry-type"], "Point"] as const;

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

export function buildGisFlowLineWidth(
  resolved: ResolvedGisFlowStyle,
  extraPx = 0,
): ExpressionSpecification {
  const base = metricWidthExpr(resolved);
  if (typeof base === "number") {
    return [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      base * 1.2 + extraPx,
      1,
      base * 1.8 + extraPx,
      2,
      base * 2.4 + extraPx,
      4,
      base * 3.2 + extraPx,
      6,
      base * 4 + extraPx,
    ];
  }
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    0,
    ["+", ["*", base, 1.2], extraPx],
    1,
    ["+", ["*", base, 1.8], extraPx],
    2,
    ["+", ["*", base, 2.4], extraPx],
    4,
    ["+", ["*", base, 3.2], extraPx],
    6,
    ["+", ["*", base, 4], extraPx],
  ];
}

function buildGisFlowGlowWidth(lineWidth: ExpressionSpecification): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 0, 8, 1, 11, 2, 14, 4, 18, 6, 22];
}

function buildGisFlowShadowWidth(_lineWidth: ExpressionSpecification): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 0, 12, 1, 16, 2, 20, 4, 26, 6, 32];
}

function buildGisFlowLinePaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-gradient": buildGisFlowLineGradient(resolved.color),
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
    "line-width": buildGisFlowLineWidth(resolved, 2.5),
    "line-blur": 0.35,
  };
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
  const layers: LayerSpecification[] = [
    {
      id: GIS_FLOW_SHADOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_SOURCE_ID,
      filter: GIS_FLOW_LINE_FILTER,
      layout: lineLayout,
      paint: buildGisFlowShadowPaint(resolved, lineWidth),
    },
    {
      id: GIS_FLOW_GLOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_SOURCE_ID,
      filter: GIS_FLOW_LINE_FILTER,
      layout: lineLayout,
      paint: buildGisFlowGlowPaint(resolved, lineWidth),
    },
    {
      id: GIS_FLOW_LINE_LAYER_ID,
      type: "line",
      source: GIS_FLOW_SOURCE_ID,
      filter: GIS_FLOW_LINE_FILTER,
      layout: lineLayout,
      paint: buildGisFlowLinePaint(resolved),
    },
    {
      id: GIS_FLOW_PULSE_LAYER_ID,
      type: "line",
      source: GIS_FLOW_SOURCE_ID,
      filter: GIS_FLOW_LINE_FILTER,
      layout: lineLayout,
      paint: buildGisFlowPulsePaint(resolved),
    },
    {
      id: GIS_FLOW_HUB_LAYER_ID,
      type: "circle",
      source: GIS_FLOW_SOURCE_ID,
      filter: GIS_FLOW_HUB_FILTER,
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
    source: {
      id: GIS_FLOW_SOURCE_ID,
      spec: { type: "geojson" as const, data: flowGeoJson, lineMetrics: true },
    },
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
    if (map.getSource(GIS_FLOW_SOURCE_ID)) return;
    try {
      const { source, layers } = buildGisFlowLayerDefinitions(payload, options);
      if (!map.getSource(source.id)) {
        map.addSource(source.id, source.spec);
      }
      for (const layer of layers) {
        if (!map.getLayer(layer.id)) {
          map.addLayer(layer);
        }
      }
    } catch (error) {
      const container = map.getContainer?.();
      if (container instanceof HTMLElement) {
        container.dataset.vsFlowEnsureError =
          error instanceof Error ? error.message : String(error);
      }
    }
  };
  const apply = () => {
    if (generation !== gisFlowDataSyncGeneration) return;
    ensureLayers();
    const source = map.getSource(GIS_FLOW_SOURCE_ID) as import("maplibre-gl").GeoJSONSource | undefined;
    if (!source) return;
    source.setData(payload);
    moveFlowLayersToTop(map);
    const container = map.getContainer?.();
    if (container instanceof HTMLElement && payload.features.length > 0) {
      container.dataset.vsFlowSynced = String(payload.features.length);
    }
    const container = map.getContainer?.();
    if (container instanceof HTMLElement && payload.features.length > 0) {
      container.dataset.vsFlowSynced = String(payload.features.length);
    }
  };
  if (map.isStyleLoaded()) {
    apply();
    return;
  }
  whenGisMapStyleReady(map, apply);
}

export function syncGisFlowStyle(map: MapLibreMap, options: GisFlowLayerOptions) {
  whenGisMapStyleReady(map, () => {
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
        map.setPaintProperty(layerId, key, value);
      }
    }
    if (map.getLayer(GIS_FLOW_HUB_LAYER_ID)) {
      map.setPaintProperty(GIS_FLOW_HUB_LAYER_ID, "circle-color", [
        "coalesce",
        ["get", "color"],
        resolved.color,
      ]);
      map.setPaintProperty(GIS_FLOW_HUB_LAYER_ID, "circle-opacity", resolved.opacity);
    }
    moveFlowLayersToTop(map);
  });
}

export function buildGisFlowStyleKey(options: GisFlowLayerOptions): string {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  return JSON.stringify({ ...resolved, flavor: options.flavor, layersActive: options.layersActive === true });
}

export function shouldAppendGisFlowLayers(options: GisFlowLayerOptions): boolean {
  if (options.layersActive) return true;
  return resolveGisFlowStyle(options.flow, options.chartColors).enabled;
}
