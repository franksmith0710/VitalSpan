import { describe, expect, it } from "vitest";
import { renderD3TreemapChart } from "./renderTreemap";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

describe("renderD3TreemapChart", () => {
  it("applies treemap shape options and label font size", () => {
    const container = document.createElement("div");
    const cleanup = renderD3TreemapChart(container, {
      width: 320,
      height: 240,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme: getAntvThemeTokens("light"),
      showLabel: true,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 16,
      options: {
        data: [
          { name: "A", value: 40 },
          { name: "B", value: 35 },
          { name: "C", value: 25 },
        ],
        __treemapPaddingInner: 6,
        __treemapPaddingOuter: 8,
        __treemapCellRadius: 5,
      },
    });

    const cell = container.querySelector("rect");
    expect(cell?.getAttribute("rx")).toBe("5");
    const label = container.querySelector("text");
    expect(label?.getAttribute("style")).toContain("font-size: 16px");
    cleanup();
  });
});
