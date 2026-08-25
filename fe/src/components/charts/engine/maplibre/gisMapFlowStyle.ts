import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import type { GisBasemapFlavor, GisProjectFlow } from "@/components/charts/engine/maplibre/gisProject";
import {
  resolveGisFlowStyle,
  type ResolvedGisFlowStyle,
} from "@/components/charts/engine/maplibre/gisProject";
import { whenGisMapStyleReady } from "@/components/charts/engine/maplibre/gisMapRuntime";

export const GIS_FLOW_SOURCE_ID = "vs-gis-flow";
export const GIS_FLOW_GLOW_LAYER_ID = "vs-gis-flow-lines-glow";
export const GIS_FLOW_LINE_LAYER_ID = "vs-gis-flow-lines";

type MapLibreMap = import("maplibre-gl").Map;

export type GisFlowLayerOptions = {
  flavor: GisBasemapFlavor;
  flow?: GisProjectFlow;
  chartColors?: string[];
};

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

/** 球面全景 zoom 很小时，固定 px 线宽几乎不可见，须随 zoom 放大。 */
export function buildGisFlowLineWidth(resolved: ResolvedGisFlowStyle): ExpressionSpecification {
  const base = metricWidthExpr(resolved);
  if (typeof base === "number") {
    return [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      base * 1.2,
      1,
      base * 1.8,
      2,
      base * 2.4,
      4,
      base * 3.2,
      6,
      base * 4,
    ];
  }
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    0,
    ["*", base, 1.2],
    1,
    ["*", base, 1.8],
    2,
    ["*", base, 2.4],
    4,
    ["*", base, 3.2],
    6,
    ["*", base, 4],
  ];
}

function buildGisFlowGlowWidth(lineWidth: ExpressionSpecification): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 0, 6, 1, 8, 2, 10, 4, 14, 6, 18];
}

export function buildGisFlowLinePaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-color": ["coalesce", ["get", "color"], resolved.color],
    "line-opacity": resolved.opacity,
    "line-width": buildGisFlowLineWidth(resolved),
    "line-blur": 0,
  };
}

function buildGisFlowGlowPaint(
  resolved: ResolvedGisFlowStyle,
  lineWidth: ExpressionSpecification,
): Record<string, unknown> {
  return {
    "line-color": resolved.color,
    "line-opacity": Math.min(1, resolved.opacity * 0.45),
    "line-width": buildGisFlowGlowWidth(lineWidth),
    "line-blur": 2.5,
  };
}

export function buildGisFlowLayerDefinitions(
  flowGeoJson: GeoJSON.FeatureCollection,
  options: GisFlowLayerOptions,
) {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  const lineWidth = buildGisFlowLineWidth(resolved);
  const layers: LayerSpecification[] = [
    {
      id: GIS_FLOW_GLOW_LAYER_ID,
      type: "line",
      source: GIS_FLOW_SOURCE_ID,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: buildGisFlowGlowPaint(resolved, lineWidth),
    },
    {
      id: GIS_FLOW_LINE_LAYER_ID,
      type: "line",
      source: GIS_FLOW_SOURCE_ID,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: buildGisFlowLinePaint(resolved),
    },
  ];
  return {
    source: {
      id: GIS_FLOW_SOURCE_ID,
      spec: { type: "geojson" as const, data: flowGeoJson },
    },
    layers,
  };
}

export function emptyGisFlowGeoJson(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

export function syncGisFlowData(map: MapLibreMap, geoJson: GeoJSON.FeatureCollection | null) {
  whenGisMapStyleReady(map, () => {
    const source = map.getSource(GIS_FLOW_SOURCE_ID) as import("maplibre-gl").GeoJSONSource | undefined;
    if (!source) return;
    source.setData(geoJson ?? emptyGisFlowGeoJson());
  });
}

const FLOW_LAYER_IDS = [GIS_FLOW_GLOW_LAYER_ID, GIS_FLOW_LINE_LAYER_ID] as const;

export function syncGisFlowStyle(map: MapLibreMap, options: GisFlowLayerOptions) {
  whenGisMapStyleReady(map, () => {
    if (!map.getLayer(GIS_FLOW_LINE_LAYER_ID)) return;
    const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
    const lineWidth = buildGisFlowLineWidth(resolved);
    const glowPaint = buildGisFlowGlowPaint(resolved, lineWidth);
    const linePaint = buildGisFlowLinePaint(resolved);
    if (map.getLayer(GIS_FLOW_GLOW_LAYER_ID)) {
      for (const [key, value] of Object.entries(glowPaint)) {
        map.setPaintProperty(GIS_FLOW_GLOW_LAYER_ID, key, value);
      }
    }
    for (const [key, value] of Object.entries(linePaint)) {
      map.setPaintProperty(GIS_FLOW_LINE_LAYER_ID, key, value);
    }
    for (const layerId of FLOW_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.moveLayer(layerId);
      }
    }
  });
}

export function buildGisFlowStyleKey(options: GisFlowLayerOptions): string {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  return JSON.stringify({ ...resolved, flavor: options.flavor });
}
