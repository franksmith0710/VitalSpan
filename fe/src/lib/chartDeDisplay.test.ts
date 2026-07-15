import { describe, expect, it } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  dashboardQueryLimitSelectValue,
  parseDeRefreshIntervalSec,
  parseDeResultLimit,
  patchChartDeDisplay,
  readChartDeDisplay,
  resolveChartQueryLimit,
  selectValueToDashboardQueryLimit,
} from "@/lib/chartDeDisplay";

const baseCfg: ChartViewConfig = { chartType: "bar", dataSourceId: "ds-1" };

describe("chartDeDisplay", () => {
  it("T-DE-DISP-01: reads defaults when nativeBody missing", () => {
    expect(readChartDeDisplay(baseCfg)).toEqual({});
  });

  it("T-DE-DISP-02: patch merges deDisplay", () => {
    const next = patchChartDeDisplay(baseCfg, { resultLimit: "500" });
    expect(readChartDeDisplay(next).resultLimit).toBe("500");
  });

  it("T-DE-DISP-03: parseDeResultLimit all → 10000", () => {
    expect(parseDeResultLimit("all")).toBe(10000);
    expect(parseDeResultLimit("500")).toBe(500);
  });

  it("T-DE-DISP-04: parseDeRefreshIntervalSec", () => {
    expect(parseDeRefreshIntervalSec("off")).toBeNull();
    expect(parseDeRefreshIntervalSec("1m")).toBe(60);
  });

  it("T-DE-DISP-05: resolveChartQueryLimit prefers widget override", () => {
    const cfg = patchChartDeDisplay(baseCfg, { resultLimit: "200" });
    expect(resolveChartQueryLimit(cfg, {})).toBe(200);
    expect(resolveChartQueryLimit(baseCfg, { defaultQueryLimit: 50 })).toBe(50);
    expect(resolveChartQueryLimit(patchChartDeDisplay(baseCfg, { resultLimit: "all" }), {})).toBe(
      10000,
    );
  });

  it("T-DE-DISP-06: dashboard query limit select round-trip", () => {
    expect(dashboardQueryLimitSelectValue(undefined)).toBe("100");
    expect(dashboardQueryLimitSelectValue(10000)).toBe("all");
    expect(dashboardQueryLimitSelectValue(500)).toBe("500");
    expect(selectValueToDashboardQueryLimit("all")).toBe(10000);
    expect(selectValueToDashboardQueryLimit("1000")).toBe(1000);
  });
});
