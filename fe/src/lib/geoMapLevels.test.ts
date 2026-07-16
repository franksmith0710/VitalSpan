import { describe, expect, it } from "vitest";
import {
  findMapDrillFilterValue,
  lookupProvinceAdcode,
  resolveGeoMapLevelContext,
} from "./geoMapLevels";
import { VS_REGIONS_MAP_ID } from "./geoMapChart";

describe("lookupProvinceAdcode", () => {
  it("resolves province full and short names", () => {
    expect(lookupProvinceAdcode("广东省")).toBe(440000);
    expect(lookupProvinceAdcode("广东")).toBe(440000);
    expect(lookupProvinceAdcode("北京市")).toBe(110000);
  });
});

describe("resolveGeoMapLevelContext", () => {
  it("returns national map at depth 0", async () => {
    const ctx = await resolveGeoMapLevelContext({
      config: {
        chartType: "map",
        dimensions: [{ field: "province" }, { field: "city" }],
        metrics: [{ field: "total" }],
      } as never,
      drillStack: [],
    });
    expect(ctx.mapId).toBe(VS_REGIONS_MAP_ID);
    expect(ctx.drillDepth).toBe(0);
    expect(ctx.knownRegionNames).toContain("广东省");
  });

  it("loads city map after province drill", async () => {
    const ctx = await resolveGeoMapLevelContext({
      config: {
        chartType: "map",
        dimensions: [{ field: "province" }, { field: "city" }],
        metrics: [{ field: "total" }],
      } as never,
      drillStack: [{ field: "province", value: "广东省", label: "广东省" }],
    });
    expect(ctx.mapId).toBe("vs-geo-440000");
    expect(ctx.drillDepth).toBe(1);
    expect(ctx.knownRegionNames).toContain("广州市");
  });
});

describe("findMapDrillFilterValue", () => {
  it("maps clicked map label to row value", () => {
    const rows = [
      ["广东", 100],
      ["北京市", 80],
    ];
    const columns = ["province", "total"];
    const known = ["广东省", "北京市", "上海市"];
    expect(findMapDrillFilterValue("广东省", "province", rows, columns, known)).toBe("广东");
  });
});
