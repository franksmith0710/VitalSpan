import { describe, expect, it } from "vitest";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import type { AntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

const basePlan: AntvRenderPlan = {
  kind: "g2plot",
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
  it("maps conditional rules to G2Plot columnStyle", () => {
    const next = applyChartStyleChain(basePlan, baseStyle, barConfig);
    expect(typeof next.options.columnStyle).toBe("function");
    const styled = (
      next.options.columnStyle as (datum: Record<string, unknown>) => { fill?: string }
    )({ y: 30 });
    expect(styled.fill).toBe("#12b76a");
  });

  it("prefers conditional columnStyle over seriesColor palette", () => {
    const styleWithSeries: ChartStyleContext = {
      ...baseStyle,
      chartColors: [],
      deStyle: {
        seriesColor: [{ name: "y", color: "#000000" }],
      },
    };
    const next = applyChartStyleChain(basePlan, styleWithSeries, barConfig);
    expect(next.options.color).toBeUndefined();
    expect(typeof next.options.columnStyle).toBe("function");
  });

});
