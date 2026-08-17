import type { FeatureCollection } from "geojson";
import type { StyleSpecification } from "maplibre-gl";
import type { GisBasemapId, GisProject } from "@/components/charts/engine/maplibre/gisProject";

export const CHINA_PROVINCES_SOURCE_ID = "vs-china-provinces";

type BuildGisMapStyleInput = {
  basemap: GisBasemapId;
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
  return {
    version: 8,
    sources: {
      [CHINA_PROVINCES_SOURCE_ID]: { type: "geojson", data },
    },
    layers: [
      { id: "vs-background", type: "background", paint: { "background-color": background } },
      {
        id: "vs-provinces-fill",
        type: "fill",
        source: CHINA_PROVINCES_SOURCE_ID,
        paint: { "fill-color": "#e2e8f0", "fill-opacity": 0.85 },
      },
      {
        id: "vs-provinces-line",
        type: "line",
        source: CHINA_PROVINCES_SOURCE_ID,
        paint: { "line-color": "#64748b", "line-width": 0.8 },
      },
    ],
  };
}

export function resolveGisMapStyleFromProject(
  project: GisProject,
  provincesGeoJson?: FeatureCollection,
): StyleSpecification {
  return buildGisMapStyle({
    basemap: project.basemap,
    provincesGeoJson: project.basemap === "china-provinces" ? provincesGeoJson : undefined,
  });
}
