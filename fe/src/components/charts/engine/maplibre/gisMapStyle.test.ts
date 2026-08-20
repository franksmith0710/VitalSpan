import { describe, expect, it } from "vitest";
import {
  DEFAULT_GIS_PROJECT,
  GIS_ATMOSPHERE_PRESETS,
  readGisProject,
} from "@/components/charts/engine/maplibre/gisProject";
import {
  appendBuildings3dLayer,
  buildPmtilesStyle,
  GIS_BUILDINGS_3D_LAYER_ID,
  normalizeProtomapsSpriteUrl,
  PMTILES_SOURCE_ID,
  resolveProtomapsSpriteUrl,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import { gisMapTransformRequest } from "@/components/charts/engine/maplibre/gisMapTransformRequest";

const RESOLVED = {
  id: "planet-z15",
  name: "Planet Z15 Global",
  pmtilesUrl: "http://localhost:8080/planet-z15-20260817.pmtiles",
  glyphsUrl: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  spriteUrl: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
};

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

  it("resolves globe fog from atmosphere preset", () => {
    const project = readGisProject({
      chartType: "gis-map",
      nativeBody: {
        gisProject: {
          projection: "globe",
          atmospherePreset: "day",
        },
      },
    });
    expect(project.fog).toEqual(GIS_ATMOSPHERE_PRESETS.day);
  });

  it("derives fog from atmosphere preset only", () => {
    const project = readGisProject({
      chartType: "gis-map",
      nativeBody: {
        gisProject: {
          projection: "globe",
          atmospherePreset: "deep-space",
          fog: GIS_ATMOSPHERE_PRESETS.day,
        },
      },
    });
    expect(project.fog).toEqual(GIS_ATMOSPHERE_PRESETS["deep-space"]);
  });

  it("defaults globe atmosphere to deep-space", () => {
    const project = readGisProject({
      chartType: "gis-map",
      nativeBody: { gisProject: { projection: "globe" } },
    });
    expect(project.fog).toEqual(GIS_ATMOSPHERE_PRESETS["deep-space"]);
    expect(project.atmospherePreset).toBe("deep-space");
  });
});

describe("gisMapStyle", () => {
  it("builds pmtiles style with protomaps source", () => {
    const style = buildPmtilesStyle(RESOLVED, "zh-Hans");
    expect(style.sources?.[PMTILES_SOURCE_ID]).toBeDefined();
    expect(style.layers?.length).toBeGreaterThan(0);
  });

  it("builds dark flavor with matching sprite", () => {
    const style = buildPmtilesStyle(RESOLVED, "en", { flavor: "dark" });
    expect(style.sprite).toContain("/dark");
  });

  it("appends buildings 3d layer when enabled", () => {
    const style = buildPmtilesStyle(RESOLVED, "zh-Hans", { buildings3d: true });
    expect(style.layers?.some((layer) => layer.id === GIS_BUILDINGS_3D_LAYER_ID)).toBe(true);
  });

  it("appendBuildings3dLayer adds extrusion layer", () => {
    const base = buildPmtilesStyle(RESOLVED);
    const next = appendBuildings3dLayer(base, "dark");
    expect(next.layers?.at(-1)?.type).toBe("fill-extrusion");
  });

  it("normalizes legacy protomaps sprite urls", () => {
    expect(
      normalizeProtomapsSpriteUrl("https://protomaps.github.io/basemaps-assets/v4/light-sprite"),
    ).toContain("/light");
  });

  it("resolveProtomapsSpriteUrl swaps flavor suffix", () => {
    expect(
      resolveProtomapsSpriteUrl(
        "dark",
        "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
      ),
    ).toBe("https://protomaps.github.io/basemaps-assets/sprites/v4/dark");
  });
});

describe("gisMapTransformRequest", () => {
  it("returns url only without auth headers", () => {
    expect(gisMapTransformRequest("https://example.com/tile/1/2/3", "Tile")).toEqual({
      url: "https://example.com/tile/1/2/3",
    });
  });
});
