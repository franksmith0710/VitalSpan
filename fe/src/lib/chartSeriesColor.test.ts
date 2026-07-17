import { describe, expect, it } from "vitest";
import {
  applyChartSeriesColorOverrides,
  chartSeriesColorCustomized,
  resolveChartSeriesColorItems,
} from "./chartSeriesColor";
import type { ChartViewConfig } from "./chartViewConfig";

const barCfg: ChartViewConfig = {
  chartType: "bar",
  metrics: [{ field: "amount", label: "amount" }],
};

describe("chartSeriesColor", () => {
  it("resolves one series per metric", () => {
    const items = resolveChartSeriesColorItems(barCfg, "default");
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("amount");
    expect(items[0]?.color).toBe("#465fff");
  });

  it("detects customized series colors", () => {
    expect(chartSeriesColorCustomized(barCfg, "default")).toBe(false);
    expect(
      chartSeriesColorCustomized(barCfg, "default", [
        { id: "amount", name: "amount", color: "#ff0000" },
      ]),
    ).toBe(true);
  });

  it("applies per-series color overrides", () => {
    const option = applyChartSeriesColorOverrides(
      { series: [{ type: "bar", name: "amount", data: [1] }] },
      [{ id: "amount", name: "amount", color: "#ff0000" }],
    );
    const series = option.series as Array<{ itemStyle?: { color?: string } }>;
    expect(series[0]?.itemStyle?.color).toBe("#ff0000");
  });
});
