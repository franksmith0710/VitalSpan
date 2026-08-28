import { describe, expect, it } from "vitest";
import { resolveGisOverlayStyle } from "@/components/charts/engine/maplibre/gisProject";
import {
  buildClusterCirclePaint,
  buildClusterCountPaint,
  buildHeatmapColorExpression,
  buildHeatmapPaint,
  buildMetricColorExpression,
  buildScatterGlowPaint,
  buildScatterRadiusExpression,
} from "@/components/charts/engine/maplibre/gisOverlayVisual";

describe("gisOverlayVisual", () => {
  it("uses ember warm transparent start for heatmap color", () => {
    const expr = buildHeatmapColorExpression("ember");
    expect(expr[0]).toBe("interpolate");
    expect(expr).toContain("rgba(255, 100, 40, 0.10)");
  });

  it("uses night glow transparent start for heatmap color", () => {
    const expr = buildHeatmapColorExpression("night");
    expect(expr[0]).toBe("interpolate");
    expect(expr).toContain("rgba(0, 0, 0, 0)");
  });

  it("builds zoom-aware scatter radius", () => {
    const resolved = resolveGisOverlayStyle({ scaleByMetric: true, radiusMin: 5, radiusMax: 18 });
    const radius = buildScatterRadiusExpression(resolved);
    expect(radius[0]).toBe("interpolate");
    expect(radius[1]).toEqual(["linear"]);
    expect(radius[2]).toEqual(["zoom"]);
  });

  it("builds metric gradient color when not category colored", () => {
    const resolved = resolveGisOverlayStyle({ colorByCategory: false, scaleByMetric: true });
    const color = buildMetricColorExpression(resolved, ["#111", "#22d3ee", "#fbbf24", "#f43f5e"]);
    expect(color[0]).toBe("interpolate");
    expect(color[2]).toEqual(["coalesce", ["get", "sizeNorm"], 0.45]);
  });

  it("builds scatter glow radius with top-level zoom interpolate", () => {
    const resolved = resolveGisOverlayStyle({ glowStrength: 0.5, opacity: 0.8 });
    const paint = buildScatterGlowPaint(resolved, 1, ["#3366cc"]);
    const radius = paint["circle-radius"] as unknown[];
    expect(radius[0]).toBe("interpolate");
    expect(radius[2]).toEqual(["zoom"]);
    expect(radius).not.toContain("*");
  });

  it("builds heatmap paint with zoom intensity and radius", () => {
    const resolved = resolveGisOverlayStyle({ heatmapIntensity: 1, heatmapRadiusMax: 22 });
    const paint = buildHeatmapPaint(resolved, 1, ["#3366cc"]);
    expect(paint["heatmap-weight"]).toBeDefined();
    expect(paint["heatmap-intensity"]?.[0]).toBe("interpolate");
    expect(paint["heatmap-radius"]?.[0]).toBe("interpolate");
    expect(paint["heatmap-color"]?.[0]).toBe("interpolate");
  });

  it("builds cluster count with light halo and white text", () => {
    const paint = buildClusterCountPaint();
    expect(paint["text-color"]).toBe("#ffffff");
    expect(paint["text-halo-width"]).toBeLessThan(1.2);
  });

  it("builds saturated cluster circles from chart accent", () => {
    const resolved = resolveGisOverlayStyle({ opacity: 0.9 });
    const paint = buildClusterCirclePaint(resolved, ["#3b82f6", "#22d3ee", "#f59e0b", "#e11d48"]);
    expect(paint["circle-color"]?.[0]).toBe("interpolate");
    expect(paint["circle-blur"]).toBeLessThan(0.2);
  });
});
