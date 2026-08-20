import { layers, namedFlavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import { normalizeOfflineGeoGeometry } from "@/components/charts/engine/geo/geoProjection";
import type { GisLabelLang, GisProject } from "@/components/charts/engine/maplibre/gisProject";
import type { TileServiceResolve } from "@/lib/tileServices";

export const CHINA_PROVINCES_SOURCE_ID = "vs-china-provinces";
export const GIS_OVERLAY_SOURCE_ID = "vs-gis-overlay";
export const GIS_OVERLAY_CIRCLE_LAYER_ID = "vs-gis-overlay-circles";
export const GIS_OVERLAY_LABEL_LAYER_ID = "vs-gis-overlay-labels";
export const PMTILES_SOURCE_ID = "protomaps";

const PROTOMAPS_LIGHT_SPRITE = "https://protomaps.github.io/basemaps-assets/sprites/v4/light";

/** 离线省界初始视野（WGS84）。 */
export const CHINA_PROVINCES_BOUNDS: [[number, number], [number, number]] = [
  [73.0, 18.0],
  [135.0, 53.5],
];

/** 兼容旧登记/默认值中的错误 sprite 路径（v4/light-sprite → sprites/v4/light）。 */
export function normalizeProtomapsSpriteUrl(spriteUrl: string | undefined): string {
  if (!spriteUrl?.trim()) return PROTOMAPS_LIGHT_SPRITE;
  const trimmed = spriteUrl.trim();
  if (trimmed.includes("/v4/light-sprite") || trimmed.endsWith("light-sprite")) {
    return PROTOMAPS_LIGHT_SPRITE;
  }
  return trimmed;
}

type FeatureCollection = GeoJSON.FeatureCollection;

type BuildGisMapStyleInput = {
  basemap: GisProject["basemap"];
  provincesGeoJson?: FeatureCollection;
  backgroundColor?: string;
};

export function buildGisMapStyle(input: BuildGisMapStyleInput): StyleSpecification {
  const background = input.backgroundColor ?? "#f8fafc";
  if (input.basemap === "blank") {
    return {
      version: 8,
      sources: {},
      layers: [{ id: "vs-background", type: "background", paint: { "background-color": background } }],
    };
  }
  const data = input.provincesGeoJson;
  if (!data) {
    throw new Error("china-provinces basemap requires GeoJSON data");
  }
  const normalized: FeatureCollection = {
    type: "FeatureCollection",
    features: data.features.map((feature) => ({
      ...feature,
      geometry: normalizeOfflineGeoGeometry(feature.geometry),
    })),
  };
  return {
    version: 8,
    sources: {
      [CHINA_PROVINCES_SOURCE_ID]: { type: "geojson", data: normalized },
    },
    layers: [
      { id: "vs-background", type: "background", paint: { "background-color": background } },
      {
        id: "vs-provinces-fill",
        type: "fill",
        source: CHINA_PROVINCES_SOURCE_ID,
        paint: { "fill-color": "#cbd5e1", "fill-opacity": 0.92 },
      },
      {
        id: "vs-provinces-line",
        type: "line",
        source: CHINA_PROVINCES_SOURCE_ID,
        paint: { "line-color": "#475569", "line-width": 1.1 },
      },
    ],
  };
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

export function resolveGisMapStyleFromProject(
  project: GisProject,
  provincesGeoJson?: FeatureCollection,
): StyleSpecification {
  if (project.basemap === "pmtiles") {
    throw new Error("pmtiles basemap requires async tile service resolve");
  }
  return buildGisMapStyle({
    basemap: project.basemap,
    provincesGeoJson: project.basemap === "china-provinces" ? provincesGeoJson : undefined,
  });
}

export function appendGisOverlayLayers(
  style: StyleSpecification,
  overlay: FeatureCollection,
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
