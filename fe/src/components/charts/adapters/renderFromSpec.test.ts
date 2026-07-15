import { describe, expect, it } from "vitest";
import { applyLineStyleVariant, buildLineOption } from "./renderFromSpec";
import { DE_AREA_FILL_OPACITY } from "@/lib/echartsSeriesPresentation";

import type { RenderSpec } from "./renderFromSpec";

const baseSpec: RenderSpec = {
  engine: "echarts",
  chartType: "line",
  styleVariant: "default",
  encoding: {
    dimensions: [{ field: "month", label: "month" }],
    metrics: [{ field: "sales", label: "sales" }],
  },
  source: { mode: "sql" },
};

describe("buildLineOption styleVariant", () => {
  it("default has no area fill", () => {
    const option = buildLineOption(
      baseSpec,
      [
        ["Jan", 10],
        ["Feb", 20],
      ],
      ["month", "sales"],
    );
    const series = option.series as Record<string, unknown>[];
    expect(series[0]?.areaStyle).toBeUndefined();
    expect(series[0]?.smooth).toBeUndefined();
  });

  it("area variant enables areaStyle fill", () => {
    const option = buildLineOption(
      { ...baseSpec, styleVariant: "area" },
      [["Jan", 10]],
      ["month", "sales"],
    );
    const series = option.series as Record<string, unknown>[];
    expect(series[0]?.areaStyle).toEqual({ opacity: DE_AREA_FILL_OPACITY });
  });

  it("smooth variant enables smooth curve", () => {
    const option = buildLineOption(
      { ...baseSpec, styleVariant: "smooth" },
      [["Jan", 10]],
      ["month", "sales"],
    );
    const series = option.series as Record<string, unknown>[];
    expect(series[0]?.smooth).toBe(true);
    expect(series[0]?.areaStyle).toBeUndefined();
  });
});

describe("applyLineStyleVariant", () => {
  it("maps known variants", () => {
    expect(applyLineStyleVariant("default")).toEqual({});
    expect(applyLineStyleVariant("area")).toEqual({ areaStyle: { opacity: DE_AREA_FILL_OPACITY } });
    expect(applyLineStyleVariant("smooth")).toEqual({ smooth: true });
  });
});
