import { describe, expect, it } from "vitest";
import {
  deAxisRenderReady,
  migrateChartConfigToDeAxes,
  resolveChartEncoding,
  writeAxisField,
} from "@/lib/resolveChartEncoding";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("resolveChartEncoding", () => {
  it("migrates legacy dimensions/metrics to axes", () => {
    const config: ChartViewConfig = {
      chartType: "line",
      dimensions: [{ field: "category" }, { field: "sub" }],
      metrics: [{ field: "value" }],
    };
    const encoding = resolveChartEncoding(config);
    expect(encoding.axes.xAxis?.[0]?.field).toBe("category");
    expect(encoding.axes.xAxisExt?.[0]?.field).toBe("sub");
    expect(encoding.axes.yAxis?.[0]?.field).toBe("value");
    expect(encoding.dimensions.map((d) => d.field)).toContain("category");
    expect(encoding.metrics.map((m) => m.field)).toContain("value");
  });

  it("stock-line maps four metrics to yAxis indices", () => {
    const config: ChartViewConfig = {
      chartType: "stock-line",
      dimensions: [{ field: "date" }],
      metrics: [{ field: "open" }, { field: "close" }, { field: "low" }, { field: "high" }],
    };
    const migrated = migrateChartConfigToDeAxes(config);
    expect(migrated.axes?.yAxis?.map((f) => f.field)).toEqual(["open", "close", "low", "high"]);
    expect(deAxisRenderReady(migrated)).toBe(true);
  });

  it("kpi has no dimension requirement", () => {
    const config: ChartViewConfig = {
      chartType: "kpi",
      metrics: [{ field: "value" }],
    };
    expect(deAxisRenderReady(migrateChartConfigToDeAxes(config))).toBe(true);
  });

  it("multi-scatter requires color, Y and X axes", () => {
    const incomplete: ChartViewConfig = {
      chartType: "multi-scatter",
      dimensions: [{ field: "color" }],
      metrics: [{ field: "y" }],
    };
    expect(deAxisRenderReady(migrateChartConfigToDeAxes(incomplete))).toBe(false);

    const complete: ChartViewConfig = {
      chartType: "multi-scatter",
      dimensions: [{ field: "color" }],
      metrics: [{ field: "y" }, { field: "x" }],
    };
    expect(deAxisRenderReady(migrateChartConfigToDeAxes(complete))).toBe(true);
  });

  it("table-info projects multiple xAxis columns to render encoding", () => {
    let config: ChartViewConfig = { chartType: "table-info" };
    config = writeAxisField(config, { axisId: "xAxis", index: 0 }, "region");
    config = writeAxisField(config, { axisId: "xAxis", index: 1 }, "amount");
    config = writeAxisField(config, { axisId: "xAxis", index: 2 }, "sale_date");

    const encoding = resolveChartEncoding(config);
    expect(encoding.axes.xAxis?.map((r) => r.field)).toEqual(["region", "amount", "sale_date"]);
    expect(encoding.dimensions.map((d) => d.field)).toContain("region");
    expect(encoding.metrics.map((m) => m.field)).toContain("amount");
  });

  it("map drill axes sync to dimensions[1/2]", () => {
    let config: ChartViewConfig = {
      chartType: "map",
      dimensions: [{ field: "province" }],
      metrics: [{ field: "value" }],
    };
    config = writeAxisField(migrateChartConfigToDeAxes(config), { axisId: "drill", index: 0 }, "city");
    config = writeAxisField(config, { axisId: "drill", index: 1 }, "district");

    expect(config.dimensions?.[1]?.field).toBe("city");
    expect(config.dimensions?.[2]?.field).toBe("district");
    expect(config.axes?.drill?.[0]?.field).toBe("city");
    expect(config.axes?.drill?.[1]?.field).toBe("district");
  });
});
