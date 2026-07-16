import { describe, expect, it } from "vitest";
import { applyEchartsSeriesPresentation, DE_AREA_FILL_OPACITY } from "./echartsSeriesPresentation";

describe("applyEchartsSeriesPresentation", () => {
  it("thickens line series for embedded dashboard", () => {
    const option = applyEchartsSeriesPresentation(
      {
        series: [{ type: "line", data: [1, 2, 3] }],
      },
      { embedded: true },
    );
    const series = option.series as Record<string, unknown>[];
    expect((series[0]?.lineStyle as { width?: number })?.width).toBe(3);
    expect(series[0]?.symbol).toBe("circle");
    expect(series[0]?.showSymbol).toBe(false);
  });

  it("applies palette opacity to area fill without lineStyle opacity multiplier", () => {
    const option = applyEchartsSeriesPresentation(
      {
        series: [{ type: "line", data: [1], areaStyle: { opacity: DE_AREA_FILL_OPACITY } }],
      },
      { paletteOpacity: 0.5 },
    );
    const series = option.series as Record<string, unknown>[];
    expect((series[0]?.lineStyle as { opacity?: number })?.opacity).toBeUndefined();
    expect((series[0]?.areaStyle as { opacity?: number })?.opacity).toBeCloseTo(
      DE_AREA_FILL_OPACITY * 0.5,
    );
  });

  it("styles bar series with max width and radius", () => {
    const option = applyEchartsSeriesPresentation({
      series: [{ type: "bar", data: [10, 20] }],
    });
    const series = option.series as Record<string, unknown>[];
    expect(series[0]?.barMaxWidth).toBe("42%");
    expect((series[0]?.itemStyle as { borderRadius?: number })?.borderRadius).toBe(3);
  });
});
