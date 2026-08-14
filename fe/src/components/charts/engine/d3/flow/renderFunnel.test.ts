import { afterEach, describe, expect, it } from "vitest";
import { renderD3FunnelChart } from "./renderFunnel";
import { computeFunnelLayout, FUNNEL_PAD, funnelLayerTopY } from "./funnelLayout";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { setDepthVisual } from "@/components/charts/engine/d3/core/depthEngine";

const theme = getAntvThemeTokens("light");
const data = [
  { stage: "A", number: 100 },
  { stage: "B", number: 80 },
  { stage: "C", number: 60 },
  { stage: "D", number: 40 },
];

function firstLayerTop(container: HTMLElement): number {
  const d = container.querySelector("path.vs-funnel-layer")?.getAttribute("d") ?? "";
  const match = /M [-\d.]+ ([\d.]+)/.exec(d);
  return Number(match?.[1] ?? NaN);
}

describe("renderD3FunnelChart", () => {
  afterEach(() => {
    setDepthVisual("off");
  });

  it("does not reserve legend space when legend is disabled", () => {
    const container = document.createElement("div");
    const cleanup = renderD3FunnelChart(container, {
      width: 180,
      height: 280,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme,
      showLabel: false,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      legendLayout: { position: "bottom" },
      options: { data },
    });

    expect(container.querySelector("g.vs-legend")).toBeNull();
    expect(firstLayerTop(container)).toBeCloseTo(FUNNEL_PAD.top, 0);
    cleanup();
  });

  it("places layers with a visible gap", () => {
    const layout = computeFunnelLayout({
      width: 200,
      height: 300,
      count: 4,
      showLegend: false,
      legendItems: [],
      showConversion: false,
      gap: 4,
    });
    expect(funnelLayerTopY(layout, 1) - (funnelLayerTopY(layout, 0) + layout.layerH)).toBe(4);
    expect(layout.margin.top).toBe(FUNNEL_PAD.top);
    expect(layout.margin.bottom).toBe(FUNNEL_PAD.bottom);
  });

  it("draws isometric top and side faces when depth is on", () => {
    setDepthVisual("standard");
    const container = document.createElement("div");
    const cleanup = renderD3FunnelChart(container, {
      width: 220,
      height: 320,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme,
      showLabel: false,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      options: { data },
    });
    expect(container.querySelectorAll("path.vs-funnel-top").length).toBe(data.length);
    expect(container.querySelectorAll("path.vs-funnel-side").length).toBe(data.length);
    expect(container.querySelectorAll("path.vs-funnel-layer").length).toBe(data.length);
    cleanup();
  });
});
