import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { buildScatterRadiusExpression } from "@/components/charts/engine/maplibre/gisOverlayVisual";
import {
  GIS_OVERLAY_CIRCLE_LAYER_ID,
  GIS_OVERLAY_CLUSTER_COUNT_LAYER_ID,
  GIS_OVERLAY_CLUSTER_FILTER,
  GIS_OVERLAY_CLUSTER_LAYER_ID,
  GIS_OVERLAY_LABEL_LAYER_ID,
  GIS_OVERLAY_SOURCE_ID,
  GIS_OVERLAY_UNCLUSTERED_FILTER,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import type { GisBasemapFlavor, GisProjectOverlay } from "@/components/charts/engine/maplibre/gisProject";
import {
  DEFAULT_GIS_OVERLAY,
  resolveGisOverlayStyle,
  type ResolvedGisOverlayStyle,
} from "@/components/charts/engine/maplibre/gisProject";
import { whenGisMapStyleReady } from "@/components/charts/engine/maplibre/gisMapRuntime";

type MapLibreMap = import("maplibre-gl").Map;

export type GisOverlayLayerOptions = {
  flavor: GisBasemapFlavor;
  overlay?: GisProjectOverlay;
  chartColors?: string[];
};

export function buildGisOverlayCircleRadius(resolved: ResolvedGisOverlayStyle): number | ExpressionSpecification {
  return buildScatterRadiusExpression(resolved);
}

function buildCircleColor(resolved: ResolvedGisOverlayStyle): string | ExpressionSpecification {
  if (resolved.colorByCategory) {
    return ["coalesce", ["get", "color"], resolved.color];
  }
  return resolved.color;
}

export function buildGisOverlayCirclePaint(
  resolved: ResolvedGisOverlayStyle,
): Record<string, unknown> {
  return {
    "circle-radius": buildGisOverlayCircleRadius(resolved),
    "circle-color": buildCircleColor(resolved),
    "circle-opacity": resolved.opacity,
    "circle-stroke-color": resolved.strokeColor,
    "circle-stroke-width": resolved.strokeWidth,
    "circle-blur": resolved.circleBlur,
  };
}

function buildClusterCirclePaint(resolved: ResolvedGisOverlayStyle): Record<string, unknown> {
  return {
    "circle-color": resolved.color,
    "circle-opacity": ["step", ["get", "point_count"], resolved.opacity * 0.78, 10, resolved.opacity * 0.86, 50, resolved.opacity * 0.94],
    "circle-stroke-color": resolved.strokeColor,
    "circle-stroke-width": Math.max(1, resolved.strokeWidth + 0.35),
    "circle-stroke-opacity": 0.9,
    "circle-blur": resolved.circleBlur * 0.35,
    "circle-radius": [
      "step",
      ["get", "point_count"],
      resolved.radiusMin + 2,
      10,
      (resolved.radiusMin + resolved.radiusMax) / 2 + 2,
      50,
      resolved.radiusMax + 2,
      200,
      resolved.radiusMax + 6,
    ],
  };
}

function overlayLabelPaint(flavor: GisBasemapFlavor) {
  const darkBasemap = flavor === "dark" || flavor === "black";
  return {
    "text-color": darkBasemap ? "#f8fafc" : "#0f172a",
    "text-halo-color": darkBasemap ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.92)",
    "text-halo-width": 1.25,
  };
}

export function buildGisOverlayLabelLayout(
  resolved: ResolvedGisOverlayStyle,
): Record<string, unknown> {
  return {
    visibility: resolved.showLabels ? "visible" : "none",
    "text-field": ["coalesce", ["get", "label"], ["to-string", ["get", "value"]]],
    "text-size": 12,
    "text-offset": [0, 0.85],
    "text-anchor": "top",
    "text-allow-overlap": false,
    "text-ignore-placement": false,
    "text-optional": true,
    "text-max-width": 8,
  };
}

export function buildGisOverlayLabelPaint(flavor: GisBasemapFlavor): Record<string, unknown> {
  return overlayLabelPaint(flavor);
}

function buildSimpleLayers(
  resolved: ResolvedGisOverlayStyle,
  flavor: GisBasemapFlavor,
): LayerSpecification[] {
  return [
    {
      id: GIS_OVERLAY_CIRCLE_LAYER_ID,
      type: "circle",
      source: GIS_OVERLAY_SOURCE_ID,
      paint: buildGisOverlayCirclePaint(resolved),
    },
    {
      id: GIS_OVERLAY_LABEL_LAYER_ID,
      type: "symbol",
      source: GIS_OVERLAY_SOURCE_ID,
      minzoom: resolved.labelMinZoom,
      layout: buildGisOverlayLabelLayout(resolved),
      paint: buildGisOverlayLabelPaint(flavor),
    },
  ];
}

function buildClusterLayers(
  resolved: ResolvedGisOverlayStyle,
  flavor: GisBasemapFlavor,
): LayerSpecification[] {
  return [
    {
      id: GIS_OVERLAY_CLUSTER_LAYER_ID,
      type: "circle",
      source: GIS_OVERLAY_SOURCE_ID,
      filter: GIS_OVERLAY_CLUSTER_FILTER,
      paint: buildClusterCirclePaint(resolved),
    },
    {
      id: GIS_OVERLAY_CLUSTER_COUNT_LAYER_ID,
      type: "symbol",
      source: GIS_OVERLAY_SOURCE_ID,
      filter: GIS_OVERLAY_CLUSTER_FILTER,
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": ["step", ["get", "point_count"], 11, 50, 12, 200, 13],
        "text-allow-overlap": true,
      },
      paint: buildGisOverlayLabelPaint(flavor),
    },
    {
      id: GIS_OVERLAY_CIRCLE_LAYER_ID,
      type: "circle",
      source: GIS_OVERLAY_SOURCE_ID,
      filter: GIS_OVERLAY_UNCLUSTERED_FILTER,
      paint: buildGisOverlayCirclePaint(resolved),
    },
    {
      id: GIS_OVERLAY_LABEL_LAYER_ID,
      type: "symbol",
      source: GIS_OVERLAY_SOURCE_ID,
      filter: GIS_OVERLAY_UNCLUSTERED_FILTER,
      minzoom: resolved.labelMinZoom,
      layout: buildGisOverlayLabelLayout(resolved),
      paint: buildGisOverlayLabelPaint(flavor),
    },
  ];
}

export function buildGisOverlayLayerDefinitions(
  overlay: GeoJSON.FeatureCollection,
  options: GisOverlayLayerOptions,
) {
  const resolved = resolveGisOverlayStyle(options.overlay, options.chartColors);
  const sourceSpec = resolved.cluster
    ? {
        type: "geojson" as const,
        data: overlay,
        cluster: true,
        clusterMaxZoom: resolved.clusterMaxZoom,
        clusterRadius: resolved.clusterRadius,
      }
    : { type: "geojson" as const, data: overlay };
  const layers = resolved.cluster
    ? buildClusterLayers(resolved, options.flavor)
    : buildSimpleLayers(resolved, options.flavor);
  return {
    source: { id: GIS_OVERLAY_SOURCE_ID, spec: sourceSpec },
    layers,
  };
}

export function emptyGisOverlayGeoJson(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

export function syncGisOverlayData(map: MapLibreMap, geoJson: GeoJSON.FeatureCollection | null) {
  whenGisMapStyleReady(map, () => {
    const source = map.getSource(GIS_OVERLAY_SOURCE_ID) as import("maplibre-gl").GeoJSONSource | undefined;
    if (!source) return;
    source.setData(geoJson ?? emptyGisOverlayGeoJson());
  });
}

function applyCirclePaint(map: MapLibreMap, layerId: string, paint: Record<string, unknown>) {
  if (!map.getLayer(layerId)) return;
  for (const [key, value] of Object.entries(paint)) {
    map.setPaintProperty(layerId, key, value);
  }
}

function applyLabelStyle(
  map: MapLibreMap,
  resolved: ResolvedGisOverlayStyle,
  flavor: GisBasemapFlavor,
) {
  if (!map.getLayer(GIS_OVERLAY_LABEL_LAYER_ID)) return;
  const labelLayout = buildGisOverlayLabelLayout(resolved);
  for (const [key, value] of Object.entries(labelLayout)) {
    map.setLayoutProperty(GIS_OVERLAY_LABEL_LAYER_ID, key, value);
  }
  map.setLayerZoomRange(GIS_OVERLAY_LABEL_LAYER_ID, resolved.labelMinZoom, 24);
  const labelPaint = buildGisOverlayLabelPaint(flavor);
  for (const [key, value] of Object.entries(labelPaint)) {
    map.setPaintProperty(GIS_OVERLAY_LABEL_LAYER_ID, key, value);
  }
}

export function syncGisOverlayStyle(map: MapLibreMap, options: GisOverlayLayerOptions) {
  whenGisMapStyleReady(map, () => {
    if (!map.getLayer(GIS_OVERLAY_CIRCLE_LAYER_ID) && !map.getLayer(GIS_OVERLAY_CLUSTER_LAYER_ID)) {
      return;
    }
    const resolved = resolveGisOverlayStyle(options.overlay, options.chartColors);
    applyCirclePaint(map, GIS_OVERLAY_CIRCLE_LAYER_ID, buildGisOverlayCirclePaint(resolved));
    applyCirclePaint(map, GIS_OVERLAY_CLUSTER_LAYER_ID, buildClusterCirclePaint(resolved));
    applyLabelStyle(map, resolved, options.flavor);
  });
}

export function buildGisOverlayStyleKey(options: GisOverlayLayerOptions): string {
  const resolved = resolveGisOverlayStyle(options.overlay, options.chartColors);
  return JSON.stringify({ ...resolved, flavor: options.flavor });
}

export { DEFAULT_GIS_OVERLAY };
