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

  it("migrates legacy heatmap to t-heatmap", () => {
    const next = migrateChartViewConfig({ chartType: "heatmap" });
    expect(next.chartType).toBe("t-heatmap");
  });

  it("migrates legacy wordCloud to word-cloud", () => {
    const next = migrateChartViewConfig({ chartType: "wordCloud" });
    expect(next.chartType).toBe("word-cloud");
  });

  it("infers sql mode when sql exists without mode", () => {
    const next = migrateChartViewConfig({
      chartType: "line",
      dataSourceId: "ds-1",
      sql: "SELECT 1",
    });
    expect(next.mode).toBe("sql");
  });

  it("promotes dataset mode to sql when sql is configured without configId", () => {
    const next = migrateChartViewConfig({
      chartType: "line",
      mode: "dataset",
      dataSourceId: "ds-1",
      sql: "SELECT 1",
    });
    expect(next.mode).toBe("sql");
  });
});
