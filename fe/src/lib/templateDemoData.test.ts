import { describe, expect, it } from "vitest";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import {
  bindTemplateDemoDatasource,
  resolveTemplateDemoDatasourceId,
  TEMPLATE_DEMO_DATASOURCE_REF,
} from "./templateDemoData";

const layout: DashboardLayout = {
  version: 1,
  widgets: [
    {
      id: "w1",
      type: "chart",
      title: "销售",
      colSpan: 6,
      rowSpan: 4,
      order: 0,
      chartConfig: {
        chartId: "w1",
        chartType: "bar",
        mode: "sql",
        sql: "SELECT 1",
        dataSourceId: TEMPLATE_DEMO_DATASOURCE_REF,
        dimensions: [],
        metrics: [],
      },
    },
  ],
  globalFilters: [],
};

describe("templateDemoData", () => {
  it("binds demo datasource ref to real id", () => {
    const bound = bindTemplateDemoDatasource(layout, "ds-sample");
    expect(bound.widgets[0]?.chartConfig?.dataSourceId).toBe("ds-sample");
  });

  it("resolves demo code before other sample heuristics", () => {
    const id = resolveTemplateDemoDatasourceId([
      { id: "1", name: "演示 MySQL", code: "demo-mysql", database: "sample_db" },
      { id: "2", name: "示例数据", code: "demo", database: "sample_db" },
    ]);
    expect(id).toBe("2");
  });

  it("resolves sample_db datasource from list", () => {
    const id = resolveTemplateDemoDatasourceId([
      { id: "other", name: "prod", code: "prod" },
      { id: "ds-sample", name: "sample_db", code: "sample_db" },
    ]);
    expect(id).toBe("ds-sample");
  });
});
