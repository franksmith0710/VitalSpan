import { describe, expect, it } from "vitest";
import {
  buildGeoMapDrillStackFromSelection,
  formatGeoMapRegionSelectionLabel,
  parseGeoMapDrillStackSelection,
  validateManualGeoMapDrillStack,
} from "./geoMapRegionPicker";

const mapConfig = {
  chartType: "map",
  dimensions: [{ field: "province" }, { field: "city" }, { field: "district" }],
  metrics: [{ field: "total" }],
} as never;

describe("buildGeoMapDrillStackFromSelection", () => {
  it("builds province-only stack", () => {
    const stack = buildGeoMapDrillStackFromSelection(mapConfig, { province: "广东省" });
    expect(stack).toEqual([
      { field: "province", value: "广东省", label: "广东省" },
    ]);
  });

  it("skips city field for municipality districts", () => {
    const stack = buildGeoMapDrillStackFromSelection(mapConfig, {
      province: "北京市",
      district: "东城区",
    });
    expect(stack).toEqual([
      { field: "province", value: "北京市", label: "北京市" },
      { field: "district", value: "东城区", label: "东城区" },
    ]);
  });

  it("builds province-city-district stack for normal provinces", () => {
    const stack = buildGeoMapDrillStackFromSelection(mapConfig, {
      province: "广东省",
      city: "广州市",
      district: "天河区",
    });
    expect(stack).toEqual([
      { field: "province", value: "广东省", label: "广东省" },
      { field: "city", value: "广州市", label: "广州市" },
      { field: "district", value: "天河区", label: "天河区" },
    ]);
  });
});

describe("parseGeoMapDrillStackSelection", () => {
  it("round-trips municipality district selection", () => {
    const stack = buildGeoMapDrillStackFromSelection(mapConfig, {
      province: "北京市",
      district: "东城区",
    });
    expect(parseGeoMapDrillStackSelection(stack)).toEqual({
      province: "北京市",
      district: "东城区",
    });
  });
});

describe("formatGeoMapRegionSelectionLabel", () => {
  it("shows leaf region name", () => {
    expect(
      formatGeoMapRegionSelectionLabel({
        province: "北京市",
        district: "东城区",
      }),
    ).toBe("东城区");
  });

  it("falls back to national label", () => {
    expect(formatGeoMapRegionSelectionLabel(null)).toBe("全国");
  });
});

describe("validateManualGeoMapDrillStack", () => {
  it("accepts guangdong drill", async () => {
    const stack = buildGeoMapDrillStackFromSelection(mapConfig, { province: "广东省" });
    const result = await validateManualGeoMapDrillStack(mapConfig, stack);
    expect(result.ok).toBe(true);
  });

  it("rejects unknown province", async () => {
    const stack = buildGeoMapDrillStackFromSelection(mapConfig, { province: "不存在省" });
    const result = await validateManualGeoMapDrillStack(mapConfig, stack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("未识别");
    }
  });
});
