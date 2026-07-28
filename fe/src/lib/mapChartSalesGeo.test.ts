import { describe, expect, it } from "vitest";
import {
  applySalesGeoDrillMapConfig,
  isSalesGeoMapConfig,
  resolveSampleDbDatasource,
  SALES_GEO_DRILL_SQL,
  SALES_GEO_PROVINCE_SQL,
} from "./mapChartSalesGeo";
import type { ChartViewConfig } from "./chartViewConfig";

const baseCfg: ChartViewConfig = {
  chartType: "map",
  dataSourceId: "ds-other",
  dimensions: [],
  metrics: [],
};

describe("mapChartSalesGeo", () => {
  it("applies v_sales_geo drill sql and slots", () => {
    const next = applySalesGeoDrillMapConfig(baseCfg, "ds-sample");
    expect(next.mode).toBe("sql");
    expect(next.sql).toBe(SALES_GEO_DRILL_SQL);
    expect(next.dataSourceId).toBe("ds-sample");
    expect(next.dimensions?.map((d) => d.field)).toEqual(["province", "city", "district"]);
    expect(next.metrics?.[0]?.field).toBe("total");
  });

  it("detects active sales geo config", () => {
    const configured = applySalesGeoDrillMapConfig(baseCfg, "ds-sample");
    expect(isSalesGeoMapConfig(configured)).toBe(true);
    expect(isSalesGeoMapConfig(baseCfg)).toBe(false);
  });

  it("resolves sample datasource by code, name or database", () => {
    const items = [
      { id: "1", name: "生产 PG", code: "prod-pg", database: "analytics" },
      { id: "2", name: "演示 MySQL", code: "demo-mysql", database: "sample_db" },
    ];
    expect(resolveSampleDbDatasource(items)?.id).toBe("2");
  });

  it("exports province aggregation sql", () => {
    expect(SALES_GEO_PROVINCE_SQL).toContain("v_sales_geo");
    expect(SALES_GEO_PROVINCE_SQL).toContain("province");
  });
});
