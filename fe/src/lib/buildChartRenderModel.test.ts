import { describe, expect, it } from "vitest";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import { buildChartRenderModel } from "./buildChartRenderModel";

describe("buildChartRenderModel", () => {
  it("returns field-level error when dimension column is missing", () => {
    const config = {
      ...defaultChartConfig("bar"),
      dimensions: [{ field: "missing_dim" }],
      metrics: [{ field: "amount" }],
    };
    const model = buildChartRenderModel(config, ["sale_date", "amount"], [
      ["2026-01-01", 100],
    ]);
    expect(model).toEqual({
      kind: "error",
      message: "维度列「missing_dim」不存在，请检查字段配置",
    });
  });

  it("builds apex series for valid bar config", () => {
    const config = {
      ...defaultChartConfig("bar"),
      dimensions: [{ field: "sale_date" }],
      metrics: [{ field: "amount" }],
    };
    const model = buildChartRenderModel(config, ["sale_date", "amount"], [
      ["2026-01-01", 100],
      ["2026-01-02", 200],
    ]);
    expect(model).toEqual({
      kind: "apex",
      chartType: "bar",
      categories: ["2026-01-01", "2026-01-02"],
      series: [{ name: "amount", data: [100, 200] }],
    });
  });

  it("routes pie to pie kind when fields are valid", () => {
    const config = {
      ...defaultChartConfig("pie"),
      dimensions: [{ field: "region" }],
      metrics: [{ field: "amount" }],
    };
    const model = buildChartRenderModel(config, ["region", "amount"], [["华东", 50]]);
    expect(model).toEqual({ kind: "pie", dim: "region", metric: "amount" });
  });
});
