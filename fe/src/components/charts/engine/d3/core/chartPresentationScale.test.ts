import { describe, expect, it } from "vitest";
import {
  resolveChartPresentationVisualScale,
  scaleChartPresentationFontSize,
} from "@/components/charts/engine/d3/core/chartPresentationScale";

describe("chartPresentationScale", () => {
  it("keeps base font size at reference span or above", () => {
    expect(scaleChartPresentationFontSize(12, { chartWidth: 400, chartHeight: 320 })).toBe(12);
    expect(scaleChartPresentationFontSize(12, { chartWidth: 480, chartHeight: 480 })).toBe(12);
  });

  it("scales font size down using the shorter chart edge", () => {
    expect(scaleChartPresentationFontSize(12, { chartWidth: 340, chartHeight: 180 })).toBe(7);
    expect(scaleChartPresentationFontSize(24, { chartWidth: 300, chartHeight: 180 })).toBe(14);
  });

  it("applies stronger thumbnail scaling for hub cards", () => {
    expect(
      scaleChartPresentationFontSize(12, {
        chartWidth: 340,
        chartHeight: 190,
        renderTier: "thumbnail",
      }),
    ).toBe(6);
    expect(
      scaleChartPresentationFontSize(24, {
        chartWidth: 340,
        chartHeight: 190,
        renderTier: "thumbnail",
      }),
    ).toBe(11);
  });

  it("inflates paint-space fonts when canvas uses visualScale", () => {
    expect(
      scaleChartPresentationFontSize(12, {
        chartWidth: 400,
        chartHeight: 320,
        visualScale: 0.5,
      }),
    ).toBe(12);
    expect(resolveChartPresentationVisualScale(400, 320, 0.5)).toBeCloseTo(0.5);
  });
});
