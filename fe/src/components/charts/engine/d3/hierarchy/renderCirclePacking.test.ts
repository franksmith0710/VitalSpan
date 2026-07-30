import { beforeEach, describe, expect, it } from "vitest";
import { renderD3CirclePackingChart } from "./renderCirclePacking";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

describe("renderD3CirclePackingChart", () => {
  beforeEach(() => {
    SVGElement.prototype.getBBox = () =>
      ({
        x: 0,
        y: 0,
        width: 40,
        height: 14,
      }) as DOMRect;
  });

  it("respects labelMinRadius when deciding visible labels", () => {
    const data = [
      { name: "A", value: 100 },
      { name: "B", value: 60 },
      { name: "C", value: 30 },
    ];
    const base = {
      width: 320,
      height: 240,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme: getAntvThemeTokens("light"),
      showLabel: true,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      options: { data },
    };

    const lowThreshold = document.createElement("div");
    const cleanupLow = renderD3CirclePackingChart(lowThreshold, {
      ...base,
      options: { ...base.options, __circlePackingLabelMinRadius: 8 },
    });
    const lowLabels = [...lowThreshold.querySelectorAll("g.pack-node text")].filter(
      (node) => (node.textContent ?? "").length > 0,
    ).length;
    cleanupLow();

    const highThreshold = document.createElement("div");
    const cleanupHigh = renderD3CirclePackingChart(highThreshold, {
      ...base,
      options: { ...base.options, __circlePackingLabelMinRadius: 999 },
    });
    const highLabels = [...highThreshold.querySelectorAll("g.pack-node text")].filter(
      (node) => (node.textContent ?? "").length > 0,
    ).length;
    cleanupHigh();

    expect(lowLabels).toBeGreaterThan(highLabels);
  });
});
