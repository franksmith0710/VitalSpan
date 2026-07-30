import { describe, expect, it } from "vitest";
import { renderD3SankeyChart } from "./renderSankey";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

const links = [
  { source: "A", target: "B", value: 10 },
  { source: "B", target: "C", value: 8 },
  { source: "A", target: "C", value: 4 },
];

describe("renderD3SankeyChart", () => {
  it("applies deStyle sankey node width from plan options", () => {
    const narrow = document.createElement("div");
    const cleanupNarrow = renderD3SankeyChart(narrow, {
      width: 480,
      height: 320,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme: getAntvThemeTokens("light"),
      showLabel: false,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      options: {
        data: links,
        __sankeyNodeWidth: 8,
        __sankeyNodeGap: 6,
        __sankeyLinkOpacity: 0.5,
      },
    });

    const narrowWidth = Number(narrow.querySelector("rect.node")?.getAttribute("width") ?? 0);
    cleanupNarrow();

    const wide = document.createElement("div");
    const cleanupWide = renderD3SankeyChart(wide, {
      width: 480,
      height: 320,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme: getAntvThemeTokens("light"),
      showLabel: false,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      options: {
        data: links,
        __sankeyNodeWidth: 24,
        __sankeyNodeGap: 6,
        __sankeyLinkOpacity: 0.5,
      },
    });

    const wideWidth = Number(wide.querySelector("rect.node")?.getAttribute("width") ?? 0);
    cleanupWide();

    expect(narrowWidth).toBe(8);
    expect(wideWidth).toBe(24);
  });
});
