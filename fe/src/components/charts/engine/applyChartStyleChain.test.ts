import { describe, expect, it } from "vitest";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

const basePlan: ChartRenderPlan = {
  kind: "d3",
  plotType: "Column",
  options: {
    data: [
      { x: "a", y: 10 },
      { x: "b", y: 30 },
    ],
    xField: "x",
    yField: "y",
  },
};

const baseStyle: ChartStyleContext = {
  scheme: "light",
  deStyle: {},
  deFeatures: {
    conditionalRules: [
      { id: "r1", enabled: true, operator: "gte", value: 20, color: "#12b76a" },
    ],
  },
  chartColors: ["#465fff"],
  dataScreenSurface: false,
  showLabel: false,
  showTooltip: true,
  seriesGradient: false,
  depthVisual: "off",
  dataZoom: false,
  labelPresentation: { fontSize: 12 },
  tooltipPresentation: { fontSize: 12 },
  shellLegend: false,
  embedEdit: false,
};

const barConfig: ChartViewConfig = {
  chartType: "bar",
  dataSourceId: "ds",
  mode: "sql",
  sql: "select 1",
  dimensions: [{ field: "x" }],
  metrics: [{ field: "y" }],
};

describe("applyChartStyleChain", () => {
  it("passes conditional rules into d3 plan options", () => {
    const next = applyChartStyleChain(basePlan, baseStyle, barConfig);
    expect(next.options.__conditionalRules).toHaveLength(1);
  });

  it("prefers conditional rules over seriesColor palette injection", () => {
    const styleWithSeries: ChartStyleContext = {
      ...baseStyle,
      chartColors: [],
      deStyle: {
        seriesColor: [{ name: "y", color: "#000000" }],
      },
    };
    const next = applyChartStyleChain(basePlan, styleWithSeries, barConfig);
    expect(next.options.color).toBeUndefined();
    expect(next.options.__conditionalRules).toHaveLength(1);
  });

  it("uses dashboard palette for inherited series colors", () => {
    const style: ChartStyleContext = {
      ...baseStyle,
      deFeatures: {},
      deStyle: {},
      effectivePaletteId: "pastel",
      chartColors: ["#84adff", "#b2ddff"],
    };
    const next = applyChartStyleChain(basePlan, style, barConfig);
    expect(next.options.color).toEqual(["#84adff"]);
  });

  it("ignores disabled conditional rules for palette injection", () => {
    const style: ChartStyleContext = {
      ...baseStyle,
      deFeatures: {
        conditionalRules: [
          { id: "r1", enabled: false, operator: "gte", value: 20, color: "#12b76a" },
        ],
      },
      effectivePaletteId: "pastel",
      chartColors: ["#84adff"],
    };
    const next = applyChartStyleChain(basePlan, style, barConfig);
    expect(next.options.color).toEqual(["#84adff"]);
  });
});
