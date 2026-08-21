import { namedFlavor } from "@protomaps/basemaps";
import type { LayerSpecification } from "maplibre-gl";
import { applyBuildings3dRuntime } from "@/components/charts/engine/maplibre/gisBuildings3d";
import type { GisBasemapFlavor, GisBasemapLayerVisibility } from "@/components/charts/engine/maplibre/gisProject";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** 平台默认海洋色（覆盖 Protomaps 浅青，统一为蓝色）。 */
export const DEFAULT_GIS_WATER_COLOR = "#2563eb";

const WATER_LAYER_PAINT: Record<string, "fill-color" | "line-color"> = {
  water: "fill-color",
  water_stream: "line-color",
  water_river: "line-color",
};

type MapLibreMap = import("maplibre-gl").Map;

export function normalizeBasemapHexColor(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!HEX_COLOR.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

export function resolveBasemapWaterColor(custom?: string): string {
  return normalizeBasemapHexColor(custom) ?? DEFAULT_GIS_WATER_COLOR;
}

export function defaultBasemapPaletteForFlavor(flavorName: GisBasemapFlavor) {
  const flavor = namedFlavor(flavorName);
  return { landColor: flavor.earth, waterColor: DEFAULT_GIS_WATER_COLOR };
}

export function buildBasemapFlavor(
  flavorName: GisBasemapFlavor,
  colors?: { landColor?: string; waterColor?: string },
) {
  const flavor = { ...namedFlavor(flavorName) };
  if (colors?.landColor) flavor.earth = colors.landColor;
  flavor.water = resolveBasemapWaterColor(colors?.waterColor);
  return flavor;
}

function isRoadLayer(id: string): boolean {
  return id.startsWith("roads_") || id === "roads_rail";
}

function isLabelLayer(id: string): boolean {
  return (
    id.includes("_label") ||
    id.startsWith("places_") ||
    id === "pois" ||
    id === "address_label" ||
    id === "roads_shields" ||
    id === "roads_oneway"
  );
}

function isBoundaryLayer(id: string): boolean {
  return id.startsWith("boundaries");
}

function isLandDetailLayer(id: string): boolean {
  return id === "landcover" || id.startsWith("landuse_");
}

function shouldHideBasemapLayer(id: string, visibility: GisBasemapLayerVisibility): boolean {
  if (visibility.roads === false && isRoadLayer(id)) return true;
  if (visibility.labels === false && isLabelLayer(id)) return true;
  if (visibility.boundaries === false && isBoundaryLayer(id)) return true;
  if (visibility.landDetail === false && isLandDetailLayer(id)) return true;
  return false;
}

export function applyBasemapLayerVisibility(
  layerList: LayerSpecification[],
  visibility: GisBasemapLayerVisibility | undefined,
): LayerSpecification[] {
  if (!visibility) return layerList;
  return layerList.map((layer) => {
    if (!shouldHideBasemapLayer(layer.id, visibility)) return layer;
    return {
      ...layer,
      layout: {
        ...(layer.layout ?? {}),
        visibility: "none",
      },
    };
  });
}

function applyLayerEarthOpacity(
  map: MapLibreMap,
  layerId: string,
  layerType: string,
  opacity: number,
) {
  switch (layerType) {
    case "fill":
      map.setPaintProperty(layerId, "fill-opacity", opacity);
      return;
    case "line":
      map.setPaintProperty(layerId, "line-opacity", opacity);
      return;
    case "symbol":
      map.setPaintProperty(layerId, "text-opacity", opacity);
      map.setPaintProperty(layerId, "icon-opacity", opacity);
      return;
    case "fill-extrusion":
      map.setPaintProperty(layerId, "fill-extrusion-opacity", opacity);
      return;
    case "circle":
      map.setPaintProperty(layerId, "circle-opacity", opacity);
      return;
    default:
      return;
  }
}

export function applyEarthBasemapOpacity(
  map: MapLibreMap,
  opacity: number,
  projection: "globe" | "mercator" = "globe",
) {
  if (projection === "globe") return;
  if (!map.isStyleLoaded()) return;
  const clamped = Math.max(0, Math.min(1, opacity));
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.id.startsWith("vs-gis-")) continue;
    applyLayerEarthOpacity(map, layer.id, layer.type, clamped);
  }
}

/** 运行时改色/图层，避免 setStyle 导致球面视角漂移。 */
export function applyBasemapRuntimePatch(
  map: MapLibreMap,
  patch: {
    flavor?: GisBasemapFlavor;
    landColor?: string;
    waterColor?: string;
    basemapLayers?: GisBasemapLayerVisibility;
    buildings3d?: boolean;
    earthOpacity?: number;
    projection?: "globe" | "mercator";
  },
) {
  if (!map.isStyleLoaded()) return;

  const landColor = patch.landColor ?? (patch.flavor ? namedFlavor(patch.flavor).earth : undefined);
  const waterColor = resolveBasemapWaterColor(patch.waterColor);

  if (landColor && map.getLayer("earth")) {
    map.setPaintProperty("earth", "fill-color", landColor);
  }
  for (const [layerId, paintKey] of Object.entries(WATER_LAYER_PAINT)) {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, paintKey, waterColor);
  }

  if (patch.buildings3d !== undefined) {
    applyBuildings3dRuntime(map, patch.buildings3d);
  }

  applyEarthBasemapOpacity(map, patch.earthOpacity ?? 1, patch.projection ?? "globe");

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.id.startsWith("vs-gis-")) continue;
    const hidden = patch.basemapLayers ? shouldHideBasemapLayer(layer.id, patch.basemapLayers) : false;
    map.setLayoutProperty(layer.id, "visibility", hidden ? "none" : "visible");
  }
}
