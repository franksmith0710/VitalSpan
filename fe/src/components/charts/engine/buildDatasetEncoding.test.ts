import { describe, expect, it } from "vitest";
import {
  buildCartesianCategorySeries,
  compositeCategoryKey,
  formatCompositeCategoryDisplay,
  resolveCartesianAxisFields,
} from "./buildDatasetEncoding";
import type { RenderSpec } from "./types";

describe("buildCartesianCategorySeries multi category", () => {
  const COLUMNS = ["region", "month", "amount"];
  const ROWS: unknown[][] = [
    ["华东", "2025-01", 100],
    ["华东", "2025-02", 150],
    ["华北", "2025-01", 200],
    ["华北", "2025-02", 180],
  ];

  it("composites multiple xAxis fields into category keys", () => {
    const spec: Pick<RenderSpec, "encoding" | "styleVariant"> = {
      styleVariant: "default",
      encoding: {
        dimensions: [{ field: "region" }, { field: "month" }],
        metrics: [{ field: "amount" }],
        axes: {
          xAxis: [{ field: "region" }, { field: "month" }],
        },
      },
    };

    const { categoryFields } = resolveCartesianAxisFields(spec.encoding);
    expect(categoryFields).toEqual(["region", "month"]);

    const key = compositeCategoryKey(ROWS[0]!, COLUMNS, categoryFields);
    expect(key).toBe("华东\u00012025-01");

    const built = buildCartesianCategorySeries(spec, ROWS, COLUMNS, "line");
    expect(built.xData).toHaveLength(4);
    expect(built.series).toHaveLength(1);
    expect(built.series[0]?.data).toHaveLength(4);
  });

  it("splits series by xAxisExt subcategory when axes are configured", () => {
    const spec: Pick<RenderSpec, "encoding" | "styleVariant"> = {
      styleVariant: "default",
      encoding: {
        dimensions: [{ field: "region" }, { field: "month" }],
        metrics: [{ field: "amount" }],
        axes: {
          xAxis: [{ field: "region" }],
          xAxisExt: [{ field: "month" }],
        },
      },
    };

    const built = buildCartesianCategorySeries(spec, ROWS, COLUMNS, "line");
    expect(built.xData.sort()).toEqual(["华东", "华北"]);
    expect(built.series.map((s) => s.name).sort()).toEqual(["2025-01", "2025-02"]);
  });

  it("formatCompositeCategoryDisplay joins internal keys for axis/tooltip", () => {
    const key = compositeCategoryKey(ROWS[0]!, COLUMNS, ["region", "month"]);
    expect(formatCompositeCategoryDisplay(key)).toBe("华东 / 2025-01");
  });
});
