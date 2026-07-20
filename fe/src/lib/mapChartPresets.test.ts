import { describe, expect, it } from "vitest";
import {
  applyDemoSalesRegionIdMap,
  applyMapDataPreset,
  detectMapDataPreset,
} from "./mapChartPresets";
import { DEMO_MAP_DRILL_SQL, DEMO_MAP_JOIN_SQL, DEMO_MAP_SALES_DRILL_SQL } from "./mapChartDataHint";
import type { ChartViewConfig } from "./chartViewConfig";

const baseCfg: ChartViewConfig = {
  chartType: "map",
  dataSourceId: "ds-demo",
  dimensions: [],
  metrics: [],
};

describe("mapChartPresets", () => {
  it("applies provincial demo sql preset", () => {
    const next = applyMapDataPreset(baseCfg, "demo-sales-province");
    expect(next.mode).toBe("sql");
    expect(next.sql).toBe(DEMO_MAP_JOIN_SQL);
    expect(next.dimensions?.[0]?.field).toBe("region");
    expect(next.metrics?.[0]?.field).toBe("total");
  });

  it("applies drill demo sql preset", () => {
    const next = applyMapDataPreset(baseCfg, "demo-drill-sql");
    expect(next.sql).toBe(DEMO_MAP_DRILL_SQL);
    expect(next.dimensions?.map((d) => d.field)).toEqual(["province", "city", "district"]);
  });

  it("applies sales drill preset from v_sales_geo", () => {
    const next = applyMapDataPreset(baseCfg, "demo-sales-drill");
    expect(next.sql).toBe(DEMO_MAP_SALES_DRILL_SQL);
    expect(next.dimensions?.map((d) => d.field)).toEqual(["province", "city", "district"]);
  });

  it("detects active preset", () => {
    const drill = applyMapDataPreset(baseCfg, "demo-drill-sql");
    expect(detectMapDataPreset(drill)).toBe("demo-drill-sql");
    const salesDrill = applyMapDataPreset(baseCfg, "demo-sales-drill");
    expect(detectMapDataPreset(salesDrill)).toBe("demo-sales-drill");
    const prov = applyMapDataPreset(baseCfg, "demo-sales-province");
    expect(detectMapDataPreset(prov)).toBe("demo-sales-province");
  });

  it("keeps dataset mode for region_id shortcut", () => {
    const next = applyDemoSalesRegionIdMap({ ...baseCfg, mode: "dataset", datasetId: "ds1" });
    expect(next.mode).toBe("dataset");
    expect(next.dimensions?.[0]?.field).toBe("region_id");
    expect(next.metrics?.[0]?.field).toBe("amount");
  });
});
