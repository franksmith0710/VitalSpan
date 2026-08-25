import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import type { GisBasemapFlavor, GisProjectFlow } from "@/components/charts/engine/maplibre/gisProject";
import {
  resolveGisFlowStyle,
  type ResolvedGisFlowStyle,
} from "@/components/charts/engine/maplibre/gisProject";
import { whenGisMapStyleReady } from "@/components/charts/engine/maplibre/gisMapRuntime";

export const GIS_FLOW_SOURCE_ID = "vs-gis-flow";
export const GIS_FLOW_LINE_LAYER_ID = "vs-gis-flow-lines";

type MapLibreMap = import("maplibre-gl").Map;

export type GisFlowLayerOptions = {
  flavor: GisBasemapFlavor;
  flow?: GisProjectFlow;
  chartColors?: string[];
};

export function buildGisFlowLineWidth(resolved: ResolvedGisFlowStyle): number | ExpressionSpecification {
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

export function buildGisFlowLinePaint(resolved: ResolvedGisFlowStyle): Record<string, unknown> {
  return {
    "line-color": ["coalesce", ["get", "color"], resolved.color],
    "line-opacity": resolved.opacity,
    "line-width": buildGisFlowLineWidth(resolved),
    "line-blur": 0.2,
    /** globe 投影下避免弧线被地形深度遮挡 */
    "line-emissive-strength": 1,
  };
}

export function buildGisFlowLayerDefinitions(
  flowGeoJson: GeoJSON.FeatureCollection,
  options: GisFlowLayerOptions,
) {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  const layers: LayerSpecification[] = [
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

export function syncGisFlowStyle(map: MapLibreMap, options: GisFlowLayerOptions) {
  whenGisMapStyleReady(map, () => {
    if (!map.getLayer(GIS_FLOW_LINE_LAYER_ID)) return;
    const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
    const paint = buildGisFlowLinePaint(resolved);
    for (const [key, value] of Object.entries(paint)) {
      map.setPaintProperty(GIS_FLOW_LINE_LAYER_ID, key, value);
    }
  });
}

export function buildGisFlowStyleKey(options: GisFlowLayerOptions): string {
  const resolved = resolveGisFlowStyle(options.flow, options.chartColors);
  return JSON.stringify({ ...resolved, flavor: options.flavor });
}
