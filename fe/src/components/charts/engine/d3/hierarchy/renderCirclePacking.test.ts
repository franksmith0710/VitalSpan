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

  it("applies circlePacking layout padding and label min radius from plan options", () => {
    const container = document.createElement("div");
    const data = [
      { name: "A", value: 100 },
      { name: "B", value: 60 },
      { name: "C", value: 30 },
    ];

    const cleanup = renderD3CirclePackingChart(container, {
      width: 320,
      height: 240,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme: getAntvThemeTokens("light"),
      showLabel: true,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      options: {
        data,
        __circlePackingPadding: 4,
        __circlePackingLabelMinRadius: 30,
      },
    });

    const labels = [...container.querySelectorAll("text")].map((node) => node.textContent ?? "");
    expect(labels.every((text) => text === "")).toBe(true);
    cleanup();
  });
});
