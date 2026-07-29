import { describe, expect, it } from "vitest";
import { renderD3GaugeChart } from "@/components/charts/engine/d3/radial/renderGauge";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

function baseConfig(overrides?: Partial<D3RenderConfig>): D3RenderConfig {
  return {
    width: 320,
    height: 240,
    colors: ["#465fff"],
    theme: getAntvThemeTokens("light"),
    showLabel: true,
    showTooltip: false,
    labelColor: undefined,
    labelFontSize: 12,
    tooltipPresentation: { fontSize: 12 },
    valueFormat: undefined,
    options: { rawValue: 72, percent: 0.72, __gaugeMin: 0, __gaugeMax: 100, __gaugeSplitNumber: 5 },
    data: [],
    ...overrides,
  } as D3RenderConfig;
}

describe("renderD3GaugeChart", () => {
  it("renders track, value arc, ticks, pointer hub and center readout", () => {
    const el = document.createElement("div");
    const dispose = renderD3GaugeChart(el, baseConfig());
    const svg = el.querySelector("svg");
    expect(svg?.getAttribute("data-testid")).toBe("d3-gauge-chart");
    expect(el.querySelectorAll("path").length).toBeGreaterThanOrEqual(3);
    expect(el.querySelectorAll(".gauge-ticks line").length).toBe(6);
    expect(el.querySelectorAll(".gauge-ticks text").length).toBeGreaterThan(0);
    const texts = [...el.querySelectorAll("text")].map((n) => n.textContent ?? "");
    expect(texts.some((t) => t.includes("72"))).toBe(true);
    dispose();
    expect(el.childNodes.length).toBe(0);
  });

  it("keeps center value when showLabel is false (ticks hide numbers)", () => {
    const el = document.createElement("div");
    renderD3GaugeChart(el, baseConfig({ showLabel: false }));
    expect(el.querySelectorAll(".gauge-ticks text").length).toBe(0);
    const texts = [...el.querySelectorAll("text")].map((n) => n.textContent);
    expect(texts.some((t) => t?.includes("72"))).toBe(true);
  });
});
