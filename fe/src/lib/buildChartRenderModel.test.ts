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

  it("returns ready for valid bar config", () => {
    const config = {
      ...defaultChartConfig("bar"),
      dimensions: [{ field: "sale_date" }],
      metrics: [{ field: "amount" }],
    };
    const model = buildChartRenderModel(config, ["sale_date", "amount"], [
      ["2026-01-01", 100],
      ["2026-01-02", 200],
    ]);
    expect(model).toEqual({ kind: "ready" });
  });

  it("returns ready for valid pie config", () => {
    const config = {
      ...defaultChartConfig("pie"),
      dimensions: [{ field: "region" }],
      metrics: [{ field: "amount" }],
    };
    const model = buildChartRenderModel(config, ["region", "amount"], [["华东", 50]]);
    expect(model).toEqual({ kind: "ready" });
  });

  it("returns ready for funnel without misrouting to bar", () => {
    const config = {
      ...defaultChartConfig("funnel"),
      dimensions: [{ field: "stage" }],
      metrics: [{ field: "value" }],
    };
    const model = buildChartRenderModel(config, ["stage", "value"], [["A", 10]]);
    expect(model).toEqual({ kind: "ready" });
  });
});
