import { beforeEach, describe, expect, it } from "vitest";
import { finalizeEmbeddedChartSvgs } from "@/components/charts/engine/d3/core/sceneGraph";
import { runD3Renderer } from "@/components/charts/engine/d3/core/d3RendererSession";
import { renderD3SankeyChart } from "./renderSankey";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

const links = [
  { source: "A", target: "B", value: 10 },
  { source: "B", target: "C", value: 8 },
  { source: "A", target: "C", value: 4 },
];

describe("renderD3SankeyChart", () => {
  beforeEach(() => {
    SVGElement.prototype.getBBox = () =>
      ({
        x: -72,
        y: 4,
        width: 420,
        height: 280,
      }) as DOMRect;
  });

  it("scales svg to include outside node labels via finalizeEmbeddedChartSvgs", () => {
    const container = document.createElement("div");
    runD3Renderer(container, () =>
      renderD3SankeyChart(container, {
        width: 320,
        height: 200,
        colors: ["#465fff", "#12b76a", "#f79009"],
        theme: getAntvThemeTokens("light"),
        showLabel: true,
        showTooltip: false,
        showLegend: false,
        labelFontSize: 11,
        options: { data: links },
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("100%");
    expect(svg?.getAttribute("height")).toBe("100%");
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    const viewBox = svg?.getAttribute("viewBox") ?? "";
    expect(viewBox).not.toBe("0 0 320 200");
    const parts = viewBox.split(/\s+/).map(Number);
    expect(parts).toHaveLength(4);
    expect(parts[2]).toBeGreaterThan(0);
    expect(parts[3]).toBeGreaterThan(0);
  });

  it("finalizeEmbeddedChartSvgs fits legacy sankey roots", () => {
    const container = document.createElement("div");
    const cleanup = renderD3SankeyChart(container, {
      width: 320,
      height: 200,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme: getAntvThemeTokens("light"),
      showLabel: true,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      options: { data: links },
    });
    finalizeEmbeddedChartSvgs(container);

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("100%");
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    cleanup();
  });

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
