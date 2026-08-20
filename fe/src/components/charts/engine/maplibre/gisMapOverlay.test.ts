import { describe, expect, it } from "vitest";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import { buildChartRenderModel } from "@/lib/buildChartRenderModel";
import { buildGisOverlayGeoJson } from "@/components/charts/engine/maplibre/gisMapOverlay";

describe("buildChartRenderModel gis-map", () => {
  it("is ready without dataset rows for basemap-only mode", () => {
    const config = defaultChartConfig("gis-map");
    expect(buildChartRenderModel(config, [], [])).toEqual({ kind: "ready" });
  });
});

describe("buildGisOverlayGeoJson", () => {
  it("builds point features from lng/lat dimensions", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      dimensions: [{ field: "lng" }, { field: "lat" }],
      metrics: [{ field: "value" }],
    };
    const geojson = buildGisOverlayGeoJson(
      config,
      ["lng", "lat", "value"],
      [
        [116.4, 39.9, 10],
        [121.5, 31.2, 20],
      ],
    );
    expect(geojson?.features).toHaveLength(2);
    expect(geojson?.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [116.4, 39.9],
    });
  });
});
