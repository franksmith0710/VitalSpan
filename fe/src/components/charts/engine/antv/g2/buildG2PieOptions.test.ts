import { describe, expect, it } from "vitest";
import {
  G2_PIE_HOVER_SCALE,
  buildG2PieRenderConfig,
  colorPieSegments,
  isRosePieChartType,
  resolveG2PieInnerRadius,
} from "@/components/charts/engine/antv/g2/buildG2PieOptions";
import type { ChartStyleContext } from "@/components/charts/engine/types";

const baseStyle: ChartStyleContext = {
  scheme: "light",
  deStyle: {},
  deFeatures: {},
  chartColors: ["#465fff", "#12b76a", "#f79009"],
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

const sampleRows = [
  { type: "A", value: 40 },
  { type: "B", value: 60 },
];

describe("buildG2PieOptions", () => {
  it("sets elementHoverScale factor on render config", () => {
    const config = buildG2PieRenderConfig("pie", sampleRows, baseStyle);
    expect(config.hoverScale).toBe(G2_PIE_HOVER_SCALE);
    expect(config.hoverScale).toBeCloseTo(1.12);
  });

  it("uses donut inner radius defaults and custom percent override", () => {
    expect(resolveG2PieInnerRadius("pie-donut", {})).toBe(0.5);
    expect(resolveG2PieInnerRadius("pie-donut", { pie: { innerRadiusPercent: 52 } })).toBe(0.52);
    expect(resolveG2PieInnerRadius("pie", {})).toBe(0);
  });

  it("marks rose chart types", () => {
    expect(isRosePieChartType("pie-rose")).toBe(true);
    expect(isRosePieChartType("pie")).toBe(false);
    const config = buildG2PieRenderConfig("pie-rose", sampleRows, baseStyle);
    expect(config.isRose).toBe(true);
  });

  it("maps conditional rules to segment colors", () => {
    const colored = colorPieSegments(sampleRows, baseStyle.chartColors, [
      { id: "r1", enabled: true, operator: "gte", value: 50, color: "#ff0000" },
    ]);
    expect(colored.find((row) => row.type === "B")?.segmentColor).toBe("#ff0000");
    expect(colored.find((row) => row.type === "A")?.segmentColor).toBe("#465fff");
  });
});
