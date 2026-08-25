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

  it("includes sample sql when unbound", () => {
    const hint = resolveGisMapDataHint(defaultChartConfig("gis-map"), []);
    expect(hint.sampleSql).toContain("de_map_heat");
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

  it("includes flow sample sql when flow enabled and unbound", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      nativeBody: { gisProject: { flow: { enabled: true } } },
    };
    const hint = resolveGisMapDataHint(config, []);
    expect(hint.sampleSql).toContain("de_map_od_hubs");
    expect(hint.message).toContain("OD 飞线");
  });

  it("warns when flow enabled but to coordinates missing in dataset columns", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      nativeBody: { gisProject: { flow: { enabled: true } } },
      dimensions: [{ field: "from_lng" }, { field: "from_lat" }],
    };
    const hint = resolveGisMapDataHint(config, ["from_lng", "from_lat"]);
    expect(hint.tone).toBe("warn");
    expect(hint.message).toContain("终点");
  });

  it("warns when to_lat missing even if dataset has full OD columns", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      nativeBody: { gisProject: { flow: { enabled: true } } },
      dimensions: [{ field: "from_lng" }, { field: "from_lat" }, { field: "to_lng" }],
    };
    const hint = resolveGisMapDataHint(config, ["from_lng", "from_lat", "to_lng", "to_lat"]);
    expect(hint.tone).toBe("warn");
    expect(hint.message).toContain("终点");
  });

  it("ok when flow from/to coordinates configured", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      nativeBody: { gisProject: { flow: { enabled: true } } },
      dimensions: [
        { field: "from_lng" },
        { field: "from_lat" },
        { field: "to_lng" },
        { field: "to_lat" },
      ],
    };
    const hint = resolveGisMapDataHint(config, ["from_lng", "from_lat", "to_lng", "to_lat", "weight"]);
    expect(hint.tone).toBe("ok");
    expect(hint.message).toContain("大圆弧线");
  });

  it("auto-detects OD axes binding without flow.enabled and shows ok hint", () => {
    const config = {
      ...defaultChartConfig("gis-map"),
      axes: {
        xAxis: [{ field: "from_lng" }],
        xAxisExt: [{ field: "from_lat" }],
        drill: [{ field: "to_lng" }, { field: "to_lat" }],
      },
    };
    const hint = resolveGisMapDataHint(config, ["from_lng", "from_lat", "to_lng", "to_lat"]);
    expect(hint.tone).toBe("ok");
    expect(hint.message).toContain("大圆弧线");
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
