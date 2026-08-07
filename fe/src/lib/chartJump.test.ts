import { describe, expect, it } from "vitest";
import {
  applyChartJumpParamsToDashboard,
  buildChartJumpHref,
  parseChartJumpSearchParams,
  resolveChartJumpParameterKey,
} from "./chartJump";
import type { ChartViewConfig } from "./chartViewConfig";
import type { ChartJumpConfig } from "./chartDeFeatures";

const cfg: ChartViewConfig = {
  chartType: "bar",
  dataSourceId: "ds",
  mode: "sql",
  sql: "select 1",
  dimensions: [{ field: "region" }],
  metrics: [{ field: "amount" }],
};

describe("chartJump", () => {
  it("buildChartJumpHref appends vs_p query for dashboard jump", () => {
    const jump: ChartJumpConfig = {
      enabled: true,
      mode: "dashboard",
      dashboardId: "dash-2",
      parameterKey: "region",
    };
    expect(
      buildChartJumpHref(jump, { category: "华东", label: "华东" }, cfg),
    ).toBe("/admin/dashboards/dash-2?vs_p_region=%E5%8D%8E%E4%B8%9C");
  });

  it("resolveChartJumpParameterKey falls back to first dimension", () => {
    const jump: ChartJumpConfig = { enabled: true, mode: "dashboard", dashboardId: "d1" };
    expect(resolveChartJumpParameterKey(cfg, jump)).toBe("region");
  });

  it("parseChartJumpSearchParams extracts vs_p keys", () => {
    expect(parseChartJumpSearchParams("?vs_p_region=华东&foo=bar")).toEqual({
      region: "华东",
    });
  });

  it("applyChartJumpParamsToDashboard maps to filter values", () => {
    const widgets = [
      {
        id: "f1",
        type: "filter" as const,
        title: "区域",
        colSpan: 4,
        rowSpan: 1,
        filterConfig: {
          filterId: "f1",
          dimensionRef: "region",
          parameterKey: "region",
          controlType: "select" as const,
        },
      },
    ];
    const result = applyChartJumpParamsToDashboard(
      { region: "华南" },
      widgets,
      { filters: [], linkageRules: [] },
      {},
    );
    expect(result.filterValues.f1).toBe("华南");
    expect(result.linkageParams.region).toBe("华南");
  });
});
