import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import {
  buildClusterCirclePaint,
  buildScatterCorePaint,
  buildScatterGlowPaint,
  buildScatterRadiusExpression,
} from "@/components/charts/engine/maplibre/gisOverlayVisual";
import {
  GIS_OVERLAY_CIRCLE_LAYER_ID,
  GIS_OVERLAY_CLUSTER_COUNT_LAYER_ID,
  GIS_OVERLAY_CLUSTER_FILTER,
  GIS_OVERLAY_CLUSTER_LAYER_ID,
  GIS_OVERLAY_GLOW_LAYER_ID,
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

export function buildGisOverlayCirclePaint(
  resolved: ResolvedGisOverlayStyle,
  chartColors?: string[],
): Record<string, unknown> {
  return buildScatterCorePaint(resolved, 1, chartColors);
}

export { buildClusterCirclePaint };

function overlayLabelPaint(flavor: GisBasemapFlavor) {
  const darkBasemap = flavor === "dark" || flavor === "black";
  return {
    "text-color": darkBasemap ? "#f8fafc" : "#0f172a",
    "text-halo-color": darkBasemap ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.92)",
    "text-halo-width": 1.25,
  };
}

function clusterCountPaint(): Record<string, unknown> {
  return {
    "text-color": "#ffffff",
    "text-halo-color": "rgba(0, 0, 0, 0.55)",
    "text-halo-width": 1.5,
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

function buildGlowLayer(
  resolved: ResolvedGisOverlayStyle,
  options: GisOverlayLayerOptions,
  filter?: typeof GIS_OVERLAY_UNCLUSTERED_FILTER,
): LayerSpecification {
  return {
    id: GIS_OVERLAY_GLOW_LAYER_ID,
    type: "circle",
    source: GIS_OVERLAY_SOURCE_ID,
    ...(filter ? { filter } : {}),
    paint: buildScatterGlowPaint(resolved, 1, options.chartColors),
  };
}

function buildSimpleLayers(
  resolved: ResolvedGisOverlayStyle,
  flavor: GisBasemapFlavor,
  options: GisOverlayLayerOptions,
): LayerSpecification[] {
  return [
    buildGlowLayer(resolved, options),
    {
      id: GIS_OVERLAY_CIRCLE_LAYER_ID,
      type: "circle",
      source: GIS_OVERLAY_SOURCE_ID,
      paint: buildGisOverlayCirclePaint(resolved, options.chartColors),
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
  options: GisOverlayLayerOptions,
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
      paint: clusterCountPaint(),
    },
    buildGlowLayer(resolved, options, GIS_OVERLAY_UNCLUSTERED_FILTER),
    {
      id: GIS_OVERLAY_CIRCLE_LAYER_ID,
      type: "circle",
      source: GIS_OVERLAY_SOURCE_ID,
      filter: GIS_OVERLAY_UNCLUSTERED_FILTER,
      paint: buildGisOverlayCirclePaint(resolved, options.chartColors),
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
    ? buildClusterLayers(resolved, options.flavor, options)
    : buildSimpleLayers(resolved, options.flavor, options);
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
    applyCirclePaint(map, GIS_OVERLAY_GLOW_LAYER_ID, buildScatterGlowPaint(resolved, 1, options.chartColors));
    applyCirclePaint(map, GIS_OVERLAY_CIRCLE_LAYER_ID, buildGisOverlayCirclePaint(resolved, options.chartColors));
    applyCirclePaint(map, GIS_OVERLAY_CLUSTER_LAYER_ID, buildClusterCirclePaint(resolved));
    if (map.getLayer(GIS_OVERLAY_CLUSTER_COUNT_LAYER_ID)) {
      const countPaint = clusterCountPaint();
      for (const [key, value] of Object.entries(countPaint)) {
        map.setPaintProperty(GIS_OVERLAY_CLUSTER_COUNT_LAYER_ID, key, value);
      }
    }
    applyLabelStyle(map, resolved, options.flavor);
  });
}

export function buildGisOverlayStyleKey(options: GisOverlayLayerOptions): string {
  const resolved = resolveGisOverlayStyle(options.overlay, options.chartColors);
  return JSON.stringify({ ...resolved, flavor: options.flavor });
}

export { DEFAULT_GIS_OVERLAY };
