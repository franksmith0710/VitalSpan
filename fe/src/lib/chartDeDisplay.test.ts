import { describe, expect, it } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  buildCustomRefreshFromParts,
  CHART_RESULT_LIMIT_OPTIONS,
  dashboardQueryLimitSelectValue,
  parseCustomRefreshParts,
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

  it("T-DE-DISP-03: parses preset and custom refresh intervals", () => {
    expect(parseDeRefreshIntervalSec("30s")).toBe(30);
    expect(parseDeRefreshIntervalSec("custom:45")).toBe(45);
    expect(parseDeRefreshIntervalSec("custom:3")).toBe(5);
    expect(parseDeRefreshIntervalSec("custom:120")).toBe(120);
    expect(parseDeRefreshIntervalSec("off")).toBeNull();
  });

  it("T-DE-DISP-04: custom refresh supports minute parts", () => {
    expect(buildCustomRefreshFromParts(2, "m")).toBe("custom:120");
    expect(parseCustomRefreshParts("custom:120")).toEqual({ amount: 2, unit: "m" });
    expect(parseCustomRefreshParts("custom:45")).toEqual({ amount: 45, unit: "s" });
  });

  it("T-DE-DISP-05: result limit options exclude 10000 and 全部", () => {
    const values = CHART_RESULT_LIMIT_OPTIONS.map((opt) => opt.value);
    expect(values).toEqual(["100", "500", "1000"]);
  });

  it("T-DE-DISP-06: legacy all/10000 coerce to latest 1000", () => {
    expect(parseDeResultLimit("all")).toBe(1000);
    expect(parseDeResultLimit("10000")).toBe(1000);
    expect(dashboardQueryLimitSelectValue(10000)).toBe("1000");
    expect(selectValueToDashboardQueryLimit("all")).toBe(1000);
    expect(
      resolveChartQueryLimit(patchChartDeDisplay(baseCfg, { resultLimit: "all" }), {}),
    ).toBe(1000);
  });
});
