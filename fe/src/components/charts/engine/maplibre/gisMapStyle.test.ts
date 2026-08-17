import { describe, expect, it } from "vitest";
import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import {
  DEFAULT_GIS_PROJECT,
  readGisProject,
} from "@/components/charts/engine/maplibre/gisProject";
import {
  CHINA_PROVINCES_SOURCE_ID,
  buildGisMapStyle,
  resolveGisMapStyleFromProject,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import { gisMapTransformRequest } from "@/components/charts/engine/maplibre/gisMapTransformRequest";

describe("gisProject", () => {
  it("returns defaults when nativeBody missing", () => {
    expect(readGisProject(undefined)).toEqual(DEFAULT_GIS_PROJECT);
  });

  it("rejects unknown basemap ids", () => {
    expect(
      readGisProject({
        chartType: "gis-map",
        nativeBody: { gisProject: { basemap: "openfreemap", view: { center: [1, 2], zoom: 4 } } },
      }).basemap,
    ).toBe("china-provinces");
  });
});

describe("gisMapStyle", () => {
  it("builds blank style without geo sources", () => {
    const style = buildGisMapStyle({ basemap: "blank" });
    expect(Object.keys(style.sources ?? {})).toHaveLength(0);
    expect(style.layers?.[0]?.type).toBe("background");
  });

  it("builds china-provinces style with fill and line layers", () => {
    const style = resolveGisMapStyleFromProject(
      { basemap: "china-provinces" },
      chinaProvincesGeo as GeoJSON.FeatureCollection,
    );
    expect(style.sources?.[CHINA_PROVINCES_SOURCE_ID]).toBeDefined();
    expect(style.layers?.some((layer) => layer.id === "vs-provinces-fill")).toBe(true);
  });
});

describe("gisMapTransformRequest", () => {
  it("returns url only without auth headers", () => {
    expect(gisMapTransformRequest("https://example.com/tile/1/2/3", "Tile")).toEqual({
      url: "https://example.com/tile/1/2/3",
    });
  });
});
