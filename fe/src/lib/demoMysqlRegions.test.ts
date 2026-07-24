import { describe, expect, it } from "vitest";
import { resolveDemoMysqlRegionByDrillDepth } from "./demoMysqlRegions";

describe("resolveDemoMysqlRegionByDrillDepth", () => {
  it("区县 region_id 上卷到省级", () => {
    expect(resolveDemoMysqlRegionByDrillDepth(811, 0)?.name).toBe("上海市");
    expect(resolveDemoMysqlRegionByDrillDepth(1611, 0)?.name).toBe("安徽省");
  });

  it("区县 region_id 在下钻到省级后解析为市级", () => {
    expect(resolveDemoMysqlRegionByDrillDepth(1611, 1)?.name).toBe("合肥市");
    expect(resolveDemoMysqlRegionByDrillDepth(811, 1)?.name).toBe("上海市");
  });

  it("省级 id 在全国视图直接匹配", () => {
    expect(resolveDemoMysqlRegionByDrillDepth(16, 0)?.name).toBe("安徽省");
  });
});
