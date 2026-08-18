import { describe, expect, it } from "vitest";
import { DEFAULT_GIS_PROJECT, readGisProject } from "@/components/charts/engine/maplibre/gisProject";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("gisProject", () => {
  it("returns default when nativeBody is empty", () => {
    expect(readGisProject(undefined)).toEqual(DEFAULT_GIS_PROJECT);
  });

  it("round-trips gisProject from nativeBody", () => {
    const source = { basemap: "blank" as const, view: { center: [116.4, 39.9] as [number, number], zoom: 5 } };
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: { gisProject: source },
    };
    expect(readGisProject(config)).toEqual(source);
  });

  it("migrates geolibreProject china layer to china-provinces basemap", () => {
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
      basemap: "china-provinces",
      view: { center: [104, 35], zoom: 4 },
    });
  });

  it("migrates blank geolibreProject without china layer", () => {
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
      basemap: "blank",
      view: { center: [120, 30], zoom: 6 },
    });
  });
});
