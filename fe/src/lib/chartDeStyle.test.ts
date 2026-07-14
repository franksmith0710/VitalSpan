import { describe, expect, it } from "vitest";
import { readChartTitleVisible } from "./chartDeStyle";
import type { ChartViewConfig } from "./chartViewConfig";

const baseCfg: ChartViewConfig = {
  chartType: "bar",
  styleVariant: "default",
  mode: "sql",
  dataSourceId: "00000000-0000-4000-8000-000000000001",
  sql: "SELECT 1",
  dimensions: [{ field: "region" }],
  metrics: [{ field: "amount" }],
};

describe("readChartTitleVisible", () => {
  it("defaults to visible when deStyle is absent", () => {
    expect(readChartTitleVisible(baseCfg)).toBe(true);
    expect(readChartTitleVisible(undefined)).toBe(true);
  });

  it("hides title when deStyle.title.show is false", () => {
    const cfg: ChartViewConfig = {
      ...baseCfg,
      nativeBody: { deStyle: { title: { show: false } } },
    };
    expect(readChartTitleVisible(cfg)).toBe(false);
  });
});
