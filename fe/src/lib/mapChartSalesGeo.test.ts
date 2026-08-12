import { describe, expect, it } from "vitest";
import {
  applySalesGeoDrillMapConfig,
  DEMO_SALES_GEO_DATASET_ID,
  isSalesGeoMapConfig,
  resolveSampleDbDatasource,
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
  it("applies v_sales_geo drill dataset and slots", () => {
    const next = applySalesGeoDrillMapConfig(baseCfg, "ds-sample", "cfg-geo");
    expect(next.mode).toBe("dataset");
    expect(next.datasetId).toBe(DEMO_SALES_GEO_DATASET_ID);
    expect(next.configId).toBe("cfg-geo");
    expect(next.dataSourceId).toBe("ds-sample");
    expect(next.dimensions?.map((d) => d.field)).toEqual(["province", "city", "district"]);
    expect(next.metrics?.[0]?.field).toBe("amount");
  });

  it("detects active sales geo config", () => {
    const configured = applySalesGeoDrillMapConfig(baseCfg, "ds-sample", "cfg-geo");
    expect(isSalesGeoMapConfig(configured)).toBe(true);
    expect(isSalesGeoMapConfig(baseCfg)).toBe(false);
  });

  it("resolves demo code before other sample heuristics", () => {
    const items = [
      { id: "1", name: "演示 MySQL", code: "demo-mysql", database: "sample_db" },
      { id: "2", name: "示例数据", code: "demo", database: "sample_db" },
    ];
    expect(resolveSampleDbDatasource(items)?.id).toBe("2");
  });

  it("resolves sample_db datasource by code, name or database", () => {
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
