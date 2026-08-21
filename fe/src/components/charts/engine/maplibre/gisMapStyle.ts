import { layers } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import {
  buildBasemapFlavor,
} from "@/components/charts/engine/maplibre/gisBasemapPalette";
import { appendBuildings3dLayerToStyle } from "@/components/charts/engine/maplibre/gisBuildings3d";
import type {
  GisBasemapFlavor,
  GisBasemapLayerVisibility,
  GisLabelLang,
} from "@/components/charts/engine/maplibre/gisProject";
import type { TileServiceResolve } from "@/lib/tileServices";

export const GIS_OVERLAY_SOURCE_ID = "vs-gis-overlay";
export const GIS_OVERLAY_CIRCLE_LAYER_ID = "vs-gis-overlay-circles";
export const GIS_OVERLAY_LABEL_LAYER_ID = "vs-gis-overlay-labels";
export { GIS_BUILDINGS_3D_LAYER_ID } from "@/components/charts/engine/maplibre/gisBuildings3d";
export const PMTILES_SOURCE_ID = "protomaps";

const PROTOMAPS_SPRITE_BASE = "https://protomaps.github.io/basemaps-assets/sprites/v4";

/** 兼容旧登记/默认值中的错误 sprite 路径（v4/light-sprite → sprites/v4/light）。 */
export function normalizeProtomapsSpriteUrl(spriteUrl: string | undefined): string {
  if (!spriteUrl?.trim()) return `${PROTOMAPS_SPRITE_BASE}/light`;
  const trimmed = spriteUrl.trim();
  if (trimmed.includes("/v4/light-sprite") || trimmed.endsWith("light-sprite")) {
    return `${PROTOMAPS_SPRITE_BASE}/light`;
  }
  return trimmed;
}

export function resolveProtomapsSpriteUrl(
  flavor: GisBasemapFlavor,
  spriteUrl: string | undefined,
): string {
  const trimmed = spriteUrl?.trim();
  if (trimmed) {
    const normalized = normalizeProtomapsSpriteUrl(trimmed);
    const flavorSuffix = normalized.match(/\/sprites\/v4\/(light|dark|grayscale|white|black)$/);
    if (flavorSuffix) {
      return normalized.replace(/\/(light|dark|grayscale|white|black)$/, `/${flavor}`);
    }
    if (normalized.includes("/v4/light-sprite") || normalized.endsWith("light-sprite")) {
      return `${PROTOMAPS_SPRITE_BASE}/${flavor}`;
    }
    return normalized;
  }
  return `${PROTOMAPS_SPRITE_BASE}/${flavor}`;
}

export type BuildPmtilesStyleOptions = {
  flavor?: GisBasemapFlavor;
  buildings3d?: boolean;
  landColor?: string;
  waterColor?: string;
  basemapLayers?: GisBasemapLayerVisibility;
};

export function buildPmtilesStyle(
  resolved: TileServiceResolve,
  labelLang: GisLabelLang = "zh-Hans",
  options: BuildPmtilesStyleOptions = {},
): StyleSpecification {
  const flavorName = options.flavor ?? "light";
  const flavor = buildBasemapFlavor(flavorName, {
    landColor: options.landColor,
    waterColor: options.waterColor,
  });
  const sprite = resolveProtomapsSpriteUrl(flavorName, resolved.spriteUrl);
  const baseLayers = layers(PMTILES_SOURCE_ID, flavor, { lang: labelLang });
  const style: StyleSpecification = {
    version: 8,
    glyphs: resolved.glyphsUrl,
    sprite,
    sources: {
      [PMTILES_SOURCE_ID]: {
        type: "vector",
        url: `pmtiles://${resolved.pmtilesUrl}`,
        attribution: resolved.name,
      },
    },
    layers: baseLayers,
  };
  return appendBuildings3dLayerToStyle(style, flavorName, options.buildings3d !== false);
}

/** @deprecated 使用 appendBuildings3dLayerToStyle */
export function appendBuildings3dLayer(
  style: StyleSpecification,
  flavor: GisBasemapFlavor = "light",
): StyleSpecification {
  return appendBuildings3dLayerToStyle(style, flavor, true);
}

function overlayLabelPaint(flavor: GisBasemapFlavor) {
  const darkBasemap = flavor === "dark" || flavor === "black";
  return {
    "text-color": darkBasemap ? "#f8fafc" : "#0f172a",
    "text-halo-color": darkBasemap ? "#0f172a" : "#ffffff",
    "text-halo-width": 1,
  };
}

export function appendGisOverlayLayers(
  style: StyleSpecification,
  overlay: GeoJSON.FeatureCollection,
  flavor: GisBasemapFlavor = "light",
): StyleSpecification {
  return {
    ...style,
    sources: {
      ...style.sources,
      [GIS_OVERLAY_SOURCE_ID]: { type: "geojson", data: overlay },
    },
    layers: [
      ...(style.layers ?? []),
      {
        id: GIS_OVERLAY_CIRCLE_LAYER_ID,
        type: "circle",
        source: GIS_OVERLAY_SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "value"], 0, 4, 100, 14],
          "circle-color": "#2563eb",
          "circle-opacity": 0.75,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      },
      {
        id: GIS_OVERLAY_LABEL_LAYER_ID,
        type: "symbol",
        source: GIS_OVERLAY_SOURCE_ID,
        layout: {
          "text-field": ["coalesce", ["get", "label"], ["to-string", ["get", "value"]]],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: overlayLabelPaint(flavor),
      },
    ],
  };
}
