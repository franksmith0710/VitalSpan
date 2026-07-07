import { describe, expect, it } from "vitest";
import { isChartViewConfig, type ChartViewConfig } from "./chartViewConfig";

describe("chartViewConfig round-trip", () => {
  it("T-VIZ-R28-001-05-fe: accepts valid table config", () => {
    const cfg: ChartViewConfig = {
      chartType: "table",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1",
    };
    expect(isChartViewConfig(cfg)).toBe(true);
  });

  it("accepts advanced chart types", () => {
    expect(isChartViewConfig({ chartType: "funnel" })).toBe(true);
  });

  it("T-VIZ-R236-005-01: accepts native mode with nativeBody and filters", () => {
    const cfg: ChartViewConfig = {
      chartType: "table",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "native",
      nativeBody: { collection: "users", query: { match_all: {} } },
      index: "logs",
      filters: [{ field: "region", operator: "eq", value: "east" }],
      dimensions: [{ field: "region" }],
      metrics: [{ field: "count" }],
    };
    expect(isChartViewConfig(cfg)).toBe(true);
  });

  it("rejects invalid chartType", () => {
    expect(isChartViewConfig({ chartType: "radar" })).toBe(false);
  });
});
