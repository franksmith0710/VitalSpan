import { layers, namedFlavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import type { GisLabelLang } from "@/components/charts/engine/maplibre/gisProject";
import type { TileServiceResolve } from "@/lib/tileServices";

export const GIS_OVERLAY_SOURCE_ID = "vs-gis-overlay";
export const GIS_OVERLAY_CIRCLE_LAYER_ID = "vs-gis-overlay-circles";
export const GIS_OVERLAY_LABEL_LAYER_ID = "vs-gis-overlay-labels";
export const PMTILES_SOURCE_ID = "protomaps";

const PROTOMAPS_LIGHT_SPRITE = "https://protomaps.github.io/basemaps-assets/sprites/v4/light";

/** 兼容旧登记/默认值中的错误 sprite 路径（v4/light-sprite → sprites/v4/light）。 */
export function normalizeProtomapsSpriteUrl(spriteUrl: string | undefined): string {
  if (!spriteUrl?.trim()) return PROTOMAPS_LIGHT_SPRITE;
  const trimmed = spriteUrl.trim();
  if (trimmed.includes("/v4/light-sprite") || trimmed.endsWith("light-sprite")) {
    return PROTOMAPS_LIGHT_SPRITE;
  }
  return trimmed;
}

export function buildPmtilesStyle(
  resolved: TileServiceResolve,
  labelLang: GisLabelLang = "zh-Hans",
): StyleSpecification {
  const flavor = namedFlavor("light");
  const sprite = normalizeProtomapsSpriteUrl(resolved.spriteUrl);
  return {
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
    layers: layers(PMTILES_SOURCE_ID, flavor, { lang: labelLang }),
  };
}

export function appendGisOverlayLayers(
  style: StyleSpecification,
  overlay: GeoJSON.FeatureCollection,
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
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      },
    ],
  };
}
