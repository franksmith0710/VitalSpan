import { describe, expect, it } from "vitest";
import {
  DEFAULT_GIS_PROJECT,
  readGisProject,
} from "@/components/charts/engine/maplibre/gisProject";
import {
  buildPmtilesStyle,
  normalizeProtomapsSpriteUrl,
  PMTILES_SOURCE_ID,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import { gisMapTransformRequest } from "@/components/charts/engine/maplibre/gisMapTransformRequest";

describe("gisProject", () => {
  it("returns defaults when nativeBody missing", () => {
    expect(readGisProject(undefined)).toEqual(DEFAULT_GIS_PROJECT);
  });

  it("normalizes unknown basemap ids to pmtiles", () => {
    expect(
      readGisProject({
        chartType: "gis-map",
        nativeBody: { gisProject: { basemap: "openfreemap", view: { center: [1, 2], zoom: 4 } } },
      }).basemap,
    ).toBe("pmtiles");
  });
});

describe("gisMapStyle", () => {
  it("builds pmtiles style with protomaps source", () => {
    const style = buildPmtilesStyle(
      {
        id: "planet-z15",
        name: "Planet Z15 Global",
        pmtilesUrl: "http://localhost:8080/planet-z15-20260817.pmtiles",
        glyphsUrl: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        spriteUrl: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
      },
      "zh-Hans",
    );
    expect(style.sources?.[PMTILES_SOURCE_ID]).toBeDefined();
    expect(style.layers?.length).toBeGreaterThan(0);
  });

  it("normalizes legacy protomaps sprite urls", () => {
    expect(
      normalizeProtomapsSpriteUrl("https://protomaps.github.io/basemaps-assets/v4/light-sprite"),
    ).toBe("https://protomaps.github.io/basemaps-assets/sprites/v4/light");
  });
});

describe("gisMapTransformRequest", () => {
  it("returns url only without auth headers", () => {
    expect(gisMapTransformRequest("https://example.com/tile/1/2/3", "Tile")).toEqual({
      url: "https://example.com/tile/1/2/3",
    });
  });
});
