import { describe, expect, it } from "vitest";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import { resolveGisMapDataHint, shouldShowGisMapOverlayHint } from "@/lib/gisMapDataHint";

describe("resolveGisMapDataHint", () => {
  it("warns when province is bound as longitude", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      dimensions: [{ field: "province" }],
      metrics: [{ field: "amount" }],
    };
    const hint = resolveGisMapDataHint(config, ["province", "city", "amount"]);
    expect(hint.tone).toBe("warn");
    expect(hint.message).toContain("province");
    expect(hint.message).toContain("区域地图");
  });

  it("warns when dataset only has geo names and nothing is bound", () => {
    const config = defaultChartConfig("gis-map");
    const hint = resolveGisMapDataHint(config, ["province", "city", "amount"]);
    expect(hint.tone).toBe("warn");
    expect(hint.message).toContain("区域地图");
  });

  it("warns when only longitude is bound", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      dimensions: [{ field: "longitude" }],
    };
    const hint = resolveGisMapDataHint(config, ["longitude", "latitude", "amount"]);
    expect(hint.tone).toBe("warn");
    expect(hint.message).toContain("纬度");
  });

  it("ok when lng/lat are configured", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      dimensions: [{ field: "longitude" }, { field: "latitude" }],
      metrics: [{ field: "amount" }],
    };
    const hint = resolveGisMapDataHint(config, ["longitude", "latitude", "amount"]);
    expect(hint.tone).toBe("ok");
  });
});

describe("shouldShowGisMapOverlayHint", () => {
  it("shows overlay hint for warn tone without geojson", () => {
    const hint = resolveGisMapDataHint(
      { ...defaultChartConfig("gis-map"), dimensions: [{ field: "province" }] },
      ["province", "amount"],
    );
    expect(shouldShowGisMapOverlayHint(hint, false)).toBe(true);
    expect(shouldShowGisMapOverlayHint(hint, true)).toBe(false);
  });
});
