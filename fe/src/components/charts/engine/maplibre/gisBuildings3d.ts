import type { FillExtrusionLayerSpecification, StyleSpecification } from "maplibre-gl";
import type { GisBasemapFlavor } from "@/components/charts/engine/maplibre/gisProject";

export const GIS_BUILDINGS_3D_LAYER_ID = "vs-gis-buildings-3d";
export const FLAT_BUILDINGS_LAYER_ID = "buildings";
export const BUILDINGS_3D_MIN_ZOOM = 12;
const PMTILES_VECTOR_SOURCE = "protomaps";

type MapLibreMap = import("maplibre-gl").Map;

export function resolveBuildings3dExtrusionPaint(flavor: GisBasemapFlavor) {
  const dark = flavor === "dark" || flavor === "black";
  const heightExpr = ["coalesce", ["get", "render_height"], ["get", "height"], 3] as const;
  return {
    "fill-extrusion-color": dark
      ? (["interpolate", ["linear"], heightExpr, 0, "#94a3b8", 40, "#64748b", 120, "#475569"] as const)
      : (["interpolate", ["linear"], heightExpr, 0, "#f4f4f5", 40, "#d4d4d8", 120, "#a1a1aa"] as const),
    "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 3] as const,
    "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0] as const,
    "fill-extrusion-opacity": 0.92,
    "fill-extrusion-vertical-gradient": true,
  };
}

export function createBuildings3dLayerSpec(
  flavor: GisBasemapFlavor,
  enabled: boolean,
): FillExtrusionLayerSpecification {
  return {
    id: GIS_BUILDINGS_3D_LAYER_ID,
    type: "fill-extrusion",
    source: PMTILES_VECTOR_SOURCE,
    "source-layer": "buildings",
    minzoom: BUILDINGS_3D_MIN_ZOOM,
    layout: { visibility: enabled ? "visible" : "none" },
    filter: ["any", [">", ["coalesce", ["get", "render_height"], ["get", "height"], 0], 0]],
    paint: resolveBuildings3dExtrusionPaint(flavor),
  };
}

export function appendBuildings3dLayerToStyle(
  style: StyleSpecification,
  flavor: GisBasemapFlavor = "light",
  enabled = true,
): StyleSpecification {
  const layers = (style.layers ?? []).map((layer) => {
    if (layer.id !== FLAT_BUILDINGS_LAYER_ID) return layer;
    return {
      ...layer,
      layout: {
        ...(layer.layout ?? {}),
        visibility: enabled ? "none" : "visible",
      },
    };
  });
  return {
    ...style,
    layers: [...layers, createBuildings3dLayerSpec(flavor, enabled)],
  };
}

export function applyBuildings3dRuntime(map: MapLibreMap, enabled: boolean) {
  if (!map.isStyleLoaded()) return;
  if (map.getLayer(GIS_BUILDINGS_3D_LAYER_ID)) {
    map.setLayoutProperty(GIS_BUILDINGS_3D_LAYER_ID, "visibility", enabled ? "visible" : "none");
  }
  if (map.getLayer(FLAT_BUILDINGS_LAYER_ID)) {
    map.setLayoutProperty(FLAT_BUILDINGS_LAYER_ID, "visibility", enabled ? "none" : "visible");
  }
}
