import { describe, expect, it } from "vitest";
import {
  getMapDrillClickField,
  getMapDrillDisplayField,
  preflightMapDrillClick,
} from "./geoMapDrill";

const mapConfig = {
  chartType: "map",
  dimensions: [{ field: "province" }, { field: "city" }, { field: "district" }],
  metrics: [{ field: "total" }],
} as never;

describe("getMapDrillDisplayField", () => {
  it("skips city slot for municipalities at depth 1", () => {
    const field = getMapDrillDisplayField(mapConfig, [
      { field: "province", value: "北京市", label: "北京市" },
    ]);
    expect(field).toBe("district");
  });

  it("uses city field for normal provinces at depth 1", () => {
    const field = getMapDrillDisplayField(mapConfig, [
      { field: "province", value: "广东省", label: "广东省" },
    ]);
    expect(field).toBe("city");
  });
});

describe("getMapDrillClickField", () => {
  it("targets district field when drilling from municipality", () => {
    const field = getMapDrillClickField(mapConfig, [
      { field: "province", value: "北京市", label: "北京市" },
    ]);
    expect(field).toBe("district");
  });
});

describe("preflightMapDrillClick", () => {
  it("rejects drill when province cannot be resolved", async () => {
    const result = await preflightMapDrillClick(
      mapConfig,
      [],
      { field: "province", value: "不存在省", label: "不存在省" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("未识别");
    }
  });

  it("accepts drill into guangdong city map", async () => {
    const result = await preflightMapDrillClick(
      mapConfig,
      [],
      { field: "province", value: "广东省", label: "广东省" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.mapId).toBe("vs-geo-440000");
      expect(result.context.drillDepth).toBe(1);
    }
  });

  it("accepts drill from guangdong into guangzhou district map", async () => {
    const result = await preflightMapDrillClick(
      mapConfig,
      [{ field: "province", value: "广东省", label: "广东省" }],
      { field: "city", value: "广州市", label: "广州市" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.mapId).toBe("vs-geo-440100");
      expect(result.context.drillDepth).toBe(2);
      expect(result.context.knownRegionNames).toContain("天河区");
    }
  });

  it("rejects drill into Taiwan city map", async () => {
    const result = await preflightMapDrillClick(
      mapConfig,
      [],
      { field: "province", value: "台湾省", label: "台湾省" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("台湾省暂无市级离线边界资产");
    }
  });

  it("rejects drill into dongguan district map when asset is missing", async () => {
    const result = await preflightMapDrillClick(
      mapConfig,
      [{ field: "province", value: "广东省", label: "广东省" }],
      { field: "city", value: "东莞市", label: "东莞市" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("东莞市");
      expect(result.message).toContain("区县离线边界");
    }
  });
});
