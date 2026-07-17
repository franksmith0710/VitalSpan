import { describe, expect, it } from "vitest";
import { DEMO_MAP_DRILL_SQL, DEMO_MAP_JOIN_SQL, mapChartFieldHint } from "./mapChartDataHint";

describe("mapChartFieldHint", () => {
  it("suggests drill sql for demo sales region_id columns", () => {
    const hint = mapChartFieldHint(["sale_date", "region_id", "amount"]);
    expect(hint?.message).toContain("仅支持省级");
    expect(hint?.sampleSql).toBe(DEMO_MAP_DRILL_SQL);
  });

  it("returns null when geo name column exists", () => {
    expect(mapChartFieldHint(["region", "amount"])).toBeNull();
  });

  it("hides sql when province and city are configured", () => {
    const hint = mapChartFieldHint(["province", "city", "total"]);
    expect(hint?.sampleSql).toBeNull();
  });
});

describe("DEMO_MAP_DRILL_SQL", () => {
  it("uses static demo rows for drill practice", () => {
    expect(DEMO_MAP_DRILL_SQL).toContain("UNION ALL");
    expect(DEMO_MAP_DRILL_SQL).toContain("province");
    expect(DEMO_MAP_DRILL_SQL).toContain("district");
  });
});

describe("DEMO_MAP_JOIN_SQL", () => {
  it("joins regions for map-friendly names", () => {
    expect(DEMO_MAP_JOIN_SQL).toContain("JOIN regions");
    expect(DEMO_MAP_JOIN_SQL).toContain("r.name");
  });
});
