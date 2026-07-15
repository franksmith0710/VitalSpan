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

  it("stripChartTitleOverrides removes entire title block", () => {
    const cfg = patchChartDeStyleNested(baseCfg, "title", {
      show: false,
      fontSize: 22,
      color: "#aabbcc",
      align: "center",
    });
    const next = stripChartTitleOverrides(cfg);
    expect(next.nativeBody?.deStyle?.title).toBeUndefined();
  });

  it("readChartTitleVisible falls back to global titleStyle.show", () => {
    expect(readChartTitleVisible(baseCfg, { show: false })).toBe(false);
    expect(readChartTitleVisible(baseCfg, { show: true })).toBe(true);
    const hidden = patchChartDeStyleNested(baseCfg, "title", { show: false });
    expect(readChartTitleVisible(hidden, { show: true })).toBe(false);
  });
});
