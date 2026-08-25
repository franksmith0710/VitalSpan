import { describe, expect, it } from "vitest";
import {
  buildGisFlowGeoJson,
  gisFlowFieldsReady,
  resolveGisMapFlowDimensions,
} from "@/components/charts/engine/maplibre/gisMapFlow";
import { ensureGisMapOdFlowEnabled } from "@/lib/gisMapFlow";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

const LIVE_CONFIG: ChartViewConfig = {
  chartType: "gis-map",
  dataSourceId: "00e7438c-33ac-4239-88a5-af28ecdece19",
  mode: "dataset",
  dimensions: [
    { field: "from_lng" },
    { field: "from_lat" },
    { field: "to_lng" },
    { field: "to_lat" },
  ],
  metrics: [],
  nativeBody: {
    gisProject: {
      flow: { enabled: true },
    },
  },
  datasetId: "demo-map-flow",
  configId: "ccbe7d77-777c-436a-aaf6-ea3454a241cb",
  axes: {
    xAxis: [{ field: "from_lng" }],
    xAxisExt: [{ field: "from_lat" }],
    drill: [{ field: "to_lng" }, { field: "to_lat" }],
  },
};

const LIVE_ROWS: (string | number)[][] = [
  [121.47, 31.23, -118.24, 34.05],
  [116.4, 39.9, -0.12, 51.51],
  [113.26, 23.13, 103.85, 1.29],
  [8.68, 50.11, -74.01, 40.71],
  [151.21, -33.87, 139.69, 35.68],
  [55.27, 25.2, 2.35, 48.86],
];

describe("gisMapFlow live config", () => {
  it("builds geojson for saved viz-component OD binding", () => {
    const cfg = ensureGisMapOdFlowEnabled(LIVE_CONFIG);
    expect(gisFlowFieldsReady(cfg)).toBe(true);
    expect(resolveGisMapFlowDimensions(cfg).map((d) => d.field)).toEqual([
      "from_lng",
      "from_lat",
      "to_lng",
      "to_lat",
    ]);
    const geo = buildGisFlowGeoJson(
      cfg,
      ["from_lng", "from_lat", "to_lng", "to_lat"],
      LIVE_ROWS,
    );
    expect(geo).not.toBeNull();
    expect(geo!.features.length).toBeGreaterThan(0);
    expect(geo!.features.some((f) => f.geometry.type === "LineString")).toBe(true);
  });
});
