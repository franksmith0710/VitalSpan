import { describe, expect, it } from "vitest";
import { migrateChartViewConfig } from "@/lib/migrateChartTypes";

describe("migrateChartViewConfig", () => {
  it("migrates legacy table to table-info", () => {
    const next = migrateChartViewConfig({ chartType: "table" });
    expect(next.chartType).toBe("table-info");
  });

  it("migrates bar stacked variant to bar-stack", () => {
    const next = migrateChartViewConfig({
      chartType: "bar",
      styleVariant: "stacked",
    });
    expect(next.chartType).toBe("bar-stack");
    expect(next.styleVariant).toBe("default");
  });

  it("migrates combo to chart-mix", () => {
    const next = migrateChartViewConfig({ chartType: "combo" });
    expect(next.chartType).toBe("chart-mix");
  });

  it("migrates timeline to smooth line", () => {
    const next = migrateChartViewConfig({ chartType: "timeline" });
    expect(next.chartType).toBe("line");
    expect(next.styleVariant).toBe("smooth");
  });
});
