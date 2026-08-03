import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { renderD3LiquidChart } from "@/components/charts/engine/d3/radial/renderLiquid";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";

function baseConfig(overrides?: Partial<D3RenderConfig>): D3RenderConfig {
  return {
    width: 400,
    height: 320,
    colors: ["#465fff"],
    theme: getAntvThemeTokens("light"),
    showLabel: true,
    showTooltip: true,
    labelColor: undefined,
    labelFontSize: 12,
    tooltipPresentation: { fontSize: 14, color: "#ff00aa", background: "#111122" },
    valueFormat: undefined,
    options: {
      rawValue: 238676,
      __liquidMax: 500000,
      __liquidFillPercent: 238676 / 500000,
      __liquidLabelPercent: 238676 / 500000,
      __liquidSize: 80,
    },
    data: [],
    ...overrides,
  } as D3RenderConfig;
}

describe("renderD3LiquidChart", () => {
  beforeEach(() => setChartAnimationSuppressed(true));
  afterEach(() => setChartAnimationSuppressed(false));

  it("renders partial fill and percent label when max exceeds raw value", () => {
    const el = document.createElement("div");
    const dispose = renderD3LiquidChart(el, baseConfig());
    const text = el.querySelector("text");
    expect(text?.textContent).toBe("48%");
    expect(text?.textContent).not.toContain("238,676");
    dispose();
  });

  it("shows 100% when target value is unset (max falls back to metric sum)", () => {
    const el = document.createElement("div");
    renderD3LiquidChart(
      el,
      baseConfig({
        options: {
          rawValue: 21400000000,
          __liquidMax: 21400000000,
          __liquidFillPercent: 1,
          __liquidLabelPercent: 1,
          __liquidSize: 80,
        },
      }),
    );
    expect(el.querySelector("text")?.textContent).toBe("100%");
  });

  it("applies tooltipPresentation styles to hover tooltip", () => {
    const el = document.createElement("div");
    renderD3LiquidChart(el, baseConfig());
    const tip = el.querySelector("div");
    expect(tip?.style.fontSize).toBe("14px");
    expect(tip?.style.color).toBe("rgb(255, 0, 170)");
    expect(tip?.style.background).toBe("rgb(17, 17, 34)");
  });

  it("does not render tooltip layer when showTooltip is false", () => {
    const el = document.createElement("div");
    renderD3LiquidChart(el, baseConfig({ showTooltip: false }));
    expect(el.querySelector("div")).toBeNull();
  });
});
