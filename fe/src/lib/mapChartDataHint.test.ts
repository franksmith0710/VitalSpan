import { describe, expect, it } from "vitest";
import { DEMO_MAP_DRILL_SQL, DEMO_MAP_JOIN_SQL, DEMO_MAP_SALES_DRILL_SQL, mapChartFieldHint } from "./mapChartDataHint";

describe("mapChartFieldHint", () => {
  it("suggests drill sql for demo sales region_id columns", () => {
    const hint = mapChartFieldHint(["sale_date", "region_id", "amount"]);
    expect(hint?.message).toContain("v_sales_geo");
    expect(hint?.sampleSql).toBe(DEMO_MAP_SALES_DRILL_SQL);
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
  it("aggregates v_sales_geo to province", () => {
    expect(DEMO_MAP_JOIN_SQL).toContain("v_sales_geo");
    expect(DEMO_MAP_JOIN_SQL).toContain("province");
  });
});

describe("DEMO_MAP_SALES_DRILL_SQL", () => {
  it("groups demo sales by province city district", () => {
    expect(DEMO_MAP_SALES_DRILL_SQL).toContain("v_sales_geo");
    expect(DEMO_MAP_SALES_DRILL_SQL).toContain("district");
  });
});
