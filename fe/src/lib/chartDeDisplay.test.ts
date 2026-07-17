import { describe, expect, it } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  buildCustomRefreshFromParts,
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
});
