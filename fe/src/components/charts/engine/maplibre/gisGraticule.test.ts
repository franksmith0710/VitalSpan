import { describe, expect, it } from "vitest";
import { buildGraticuleGeoJson } from "@/components/charts/engine/maplibre/gisGraticule";

describe("buildGraticuleGeoJson", () => {
  it("includes meridians and parallels at step interval", () => {
    const geojson = buildGraticuleGeoJson(15);
    const meridians = geojson.features.filter(
      (feature) => feature.properties?.kind === "meridian",
    );
    const parallels = geojson.features.filter(
      (feature) => feature.properties?.kind === "parallel",
    );
    expect(meridians.length).toBeGreaterThan(20);
    expect(parallels.length).toBeGreaterThan(8);
  });
});
