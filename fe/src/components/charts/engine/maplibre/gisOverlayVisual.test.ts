import { describe, expect, it } from "vitest";
import { resolveGisOverlayStyle } from "@/components/charts/engine/maplibre/gisProject";
import {
  buildHeatmapColorExpression,
  buildHeatmapPaint,
  buildScatterRadiusExpression,
} from "@/components/charts/engine/maplibre/gisOverlayVisual";

describe("gisOverlayVisual", () => {
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

  it("builds heatmap paint with zoom intensity and radius", () => {
    const resolved = resolveGisOverlayStyle({ heatmapIntensity: 1, heatmapRadiusMax: 22 });
    const paint = buildHeatmapPaint(resolved, 1, ["#3366cc"]);
    expect(paint["heatmap-weight"]).toBeDefined();
    expect(paint["heatmap-intensity"]?.[0]).toBe("interpolate");
    expect(paint["heatmap-radius"]?.[0]).toBe("interpolate");
    expect(paint["heatmap-color"]?.[0]).toBe("interpolate");
  });
});
