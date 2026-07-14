import { describe, expect, it } from "vitest";
import { chartDataSlotBlueprint, chartFieldSlotHints } from "@/components/dashboard/chartFieldSlots";

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
});
