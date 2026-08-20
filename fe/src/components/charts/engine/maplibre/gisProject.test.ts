import { describe, expect, it } from "vitest";
import {
  DEFAULT_GIS_PROJECT,
  DEFAULT_PMTILES_TILE_SERVICE_ID,
  readGisProject,
  resolveGisRenderableBasemap,
} from "@/components/charts/engine/maplibre/gisProject";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("gisProject", () => {
  it("returns default pmtiles project when nativeBody is empty", () => {
    expect(readGisProject(undefined)).toEqual(DEFAULT_GIS_PROJECT);
  });

  it("normalizes legacy offline basemap to pmtiles", () => {
    const source = { basemap: "blank" as const, view: { center: [116.4, 39.9] as [number, number], zoom: 5 } };
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: { gisProject: source },
    };
    expect(readGisProject(config)).toEqual({
      ...DEFAULT_GIS_PROJECT,
      autoRotate: false,
      buildings3d: false,
      showControls: false,
      view: { center: [116.4, 39.9], zoom: 5, bearing: undefined, pitch: undefined },
    });
  });

  it("migrates geolibreProject to pmtiles with default tile service", () => {
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: {
        geolibreProject: {
          version: "1",
          layers: [{ id: "vitalspan-china-provinces", metadata: { vitalspanTemplate: "china-provinces" } }],
          mapView: { center: [104, 35], zoom: 4 },
        },
      },
    };
    expect(readGisProject(config)).toEqual({
      ...DEFAULT_GIS_PROJECT,
      view: { center: [104, 35], zoom: 4 },
    });
  });

  it("migrates blank geolibreProject to pmtiles", () => {
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: {
        geolibreProject: {
          version: "1",
          layers: [],
          mapView: { center: [120, 30], zoom: 6 },
        },
      },
    };
    expect(readGisProject(config)).toEqual({
      ...DEFAULT_GIS_PROJECT,
      view: { center: [120, 30], zoom: 6 },
    });
  });

  it("does not render until pmtiles style is ready", () => {
    expect(
      resolveGisRenderableBasemap(
        { ...DEFAULT_GIS_PROJECT, tileServiceId: DEFAULT_PMTILES_TILE_SERVICE_ID },
        false,
      ),
    ).toBeNull();
    expect(
      resolveGisRenderableBasemap(
        { ...DEFAULT_GIS_PROJECT, tileServiceId: DEFAULT_PMTILES_TILE_SERVICE_ID },
        true,
      ),
    ).toBe("pmtiles");
  });

  it("defaults missing tileServiceId to planet-z15", () => {
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: { gisProject: { basemap: "pmtiles" } },
    };
    expect(readGisProject(config).basemap).toBe("pmtiles");
    expect(readGisProject(config).tileServiceId).toBe(DEFAULT_PMTILES_TILE_SERVICE_ID);
    expect(readGisProject(config).basemapFlavor).toBe("light");
  });

  it("normalizes basemap flavor and optional flags", () => {
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: {
        gisProject: {
          basemapFlavor: "dark",
          showControls: true,
          buildings3d: true,
          autoRotate: true,
        },
      },
    };
    const project = readGisProject(config);
    expect(project.basemapFlavor).toBe("dark");
    expect(project.showControls).toBe(true);
    expect(project.buildings3d).toBe(true);
    expect(project.autoRotate).toBe(true);
  });
});
