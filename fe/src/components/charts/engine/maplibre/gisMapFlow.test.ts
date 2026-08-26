import { describe, expect, it } from "vitest";
import {
  buildGisFlowGeoJson,
  gisFlowFieldsReady,
  interpolateGreatCircleArc,
} from "@/components/charts/engine/maplibre/gisMapFlow";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("gisMapFlow", () => {
  it("interpolates great circle with more than two coordinates", () => {
    const arc = interpolateGreatCircleArc(121.47, 31.23, -118.24, 34.05, 8);
    expect(arc.length).toBeGreaterThan(2);
    expect(arc[0]?.[0]).toBeCloseTo(121.47, 2);
    expect(arc[0]?.[1]).toBeCloseTo(31.23, 2);
    expect(arc[arc.length - 1]?.[0]).toBeCloseTo(-118.24, 1);
  });

  it("builds LineString features when flow enabled", () => {
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: { gisProject: { flow: { enabled: true } } },
      dimensions: [
        { field: "from_lng" },
        { field: "from_lat" },
        { field: "to_lng" },
        { field: "to_lat" },
        { field: "route_name" },
      ],
      metrics: [{ field: "weight" }],
    };
    const geoJson = buildGisFlowGeoJson(
      config,
      ["from_lng", "from_lat", "to_lng", "to_lat", "route_name", "weight"],
      [[121.47, 31.23, -118.24, 34.05, "上海 → 洛杉矶", 920]],
      ["#38bdf8"],
    );
    expect(geoJson?.features.some((f) => f.geometry.type === "LineString")).toBe(true);
    expect(geoJson?.features.some((f) => f.geometry.type === "Point")).toBe(true);
    expect(geoJson?.features.filter((f) => f.geometry.type === "LineString").length).toBeGreaterThanOrEqual(1);
    expect(geoJson?.features.filter((f) => f.geometry.type === "Point")).toHaveLength(2);
    expect(
      geoJson?.features.find((f) => f.geometry.type === "Point" && f.properties?.hubRole === "source"),
    ).toBeTruthy();
    expect(
      geoJson?.features.find((f) => f.geometry.type === "Point" && f.properties?.hubRole === "dest"),
    ).toBeTruthy();
    expect(
      geoJson?.features.find((f) => f.geometry.type === "LineString")?.properties?.weightNorm,
    ).toBe(0.5);
    expect(gisFlowFieldsReady(config)).toBe(true);
  });

  it("deduplicates one source hub for one-to-many OD rows", () => {
    const config: ChartViewConfig = {
      chartType: "gis-map",
      nativeBody: { gisProject: { flow: { enabled: true } } },
      dimensions: [
        { field: "from_lng" },
        { field: "from_lat" },
        { field: "to_lng" },
        { field: "to_lat" },
      ],
    };
    const geoJson = buildGisFlowGeoJson(
      config,
      ["from_lng", "from_lat", "to_lng", "to_lat"],
      [
        [121.47, 31.23, -118.24, 34.05],
        [121.47, 31.23, 139.69, 35.68],
        [121.47, 31.23, 103.85, 1.29],
      ],
      ["#38bdf8"],
    );
    const hubs = geoJson?.features.filter((f) => f.geometry.type === "Point") ?? [];
    expect(hubs.filter((f) => f.properties?.hubRole === "source")).toHaveLength(1);
    expect(hubs.filter((f) => f.properties?.hubRole === "dest")).toHaveLength(3);
    expect(hubs.find((f) => f.properties?.hubRole === "source")?.properties?.outbound).toBe(3);
  });

  it("returns null when flow disabled", () => {
    const config: ChartViewConfig = {
      chartType: "gis-map",
      dimensions: [
        { field: "from_lng" },
        { field: "from_lat" },
        { field: "to_lng" },
        { field: "to_lat" },
      ],
    };
    expect(buildGisFlowGeoJson(config, ["from_lng", "from_lat", "to_lng", "to_lat"], [])).toBeNull();
  });
});
