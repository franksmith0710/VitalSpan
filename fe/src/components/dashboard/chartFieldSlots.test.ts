import { describe, expect, it } from "vitest";
import { chartDataSlotBlueprint, chartFieldSlotHints, chartRenderRequiredCounts } from "@/components/dashboard/chartFieldSlots";

describe("chartFieldSlots", () => {
  it("T-INSP-DE-01: bar chart uses category/value axis labels", () => {
    expect(chartFieldSlotHints("bar")).toEqual({
      dimensionLabel: "类别轴 / 维度",
      metricLabel: "值轴 / 指标",
    });
  });

  it("T-INSP-DE-02: pie chart uses sector labels", () => {
    expect(chartFieldSlotHints("pie").dimensionLabel).toBe("扇区 / 维度");
  });

  it("T-INSP-DE-03: line chart exposes DE slot blueprint", () => {
    expect(chartDataSlotBlueprint("line").map((s) => s.label)).toEqual([
      "类别轴 / 维度",
      "子类别 / 维度",
      "值轴 / 指标",
      "钻取 / 维度",
    ]);
  });

  it("T-INSP-DE-04: sankey requires source and target dimension slots", () => {
    expect(chartDataSlotBlueprint("sankey").map((s) => s.label)).toEqual([
      "起始 / 维度",
      "终点 / 维度",
      "边权 / 指标",
    ]);
  });

  it("T-INSP-DE-05: heatmap requires x and y dimensions", () => {
    expect(chartDataSlotBlueprint("heatmap").map((s) => s.label)).toContain("纵轴 / 维度");
  });

  it("T-INSP-DE-06: timeline uses single time dimension slot", () => {
    expect(chartDataSlotBlueprint("timeline").map((s) => s.label)).toEqual([
      "时间 / 维度",
      "数值 / 指标",
    ]);
  });

  it("T-INSP-DE-07: line chart render requires only category + metric", () => {
    expect(chartRenderRequiredCounts("line")).toEqual({
      minDimensions: 1,
      minMetrics: 1,
    });
  });

  it("T-INSP-DE-09: dual-axis chart requires column + line metrics", () => {
    expect(chartDataSlotBlueprint("chart-mix").map((s) => s.label)).toEqual([
      "类别轴 / 维度",
      "子类别 / 维度",
      "柱指标 / 指标",
      "线指标 / 指标",
      "钻取 / 维度",
    ]);
    expect(chartRenderRequiredCounts("chart-mix")).toEqual({
      minDimensions: 1,
      minMetrics: 2,
    });
  });
});
