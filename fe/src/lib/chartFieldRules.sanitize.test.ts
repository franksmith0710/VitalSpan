import { describe, expect, it } from "vitest";
import { applyGisMapFlowConfig } from "@/lib/gisMapFlow";
import { sanitizeChartFieldsForValidate } from "@/lib/chartFieldRules";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("sanitizeChartFieldsForValidate gis-map OD", () => {
  it("keeps five dimension slots after persist sanitize", () => {
    const cfg = applyGisMapFlowConfig({ chartType: "gis-map" }, "sample-ds");
    const sanitized = sanitizeChartFieldsForValidate(cfg);
    expect(sanitized.dimensions?.map((d) => d.field)).toEqual([
      "from_lng",
      "from_lat",
      "to_lng",
      "to_lat",
      "route_name",
    ]);
    expect(sanitized.metrics?.[0]?.field).toBe("weight");
  });

  it("keeps drill axes when legacy dimensions were truncated", () => {
    const cfg: ChartViewConfig = {
      chartType: "gis-map",
      mode: "sql",
      sql: "SELECT 1",
      dimensions: [{ field: "from_lng" }, { field: "from_lat" }, { field: "to_lng" }],
      metrics: [{ field: "weight" }],
      axes: {
        xAxis: [{ field: "from_lng" }],
        xAxisExt: [{ field: "from_lat" }],
        yAxis: [{ field: "weight" }],
        drill: [{ field: "to_lng" }, { field: "to_lat" }, { field: "route_name" }],
      },
      nativeBody: { gisProject: { flow: { enabled: true } } },
    };
    const sanitized = sanitizeChartFieldsForValidate(cfg);
    expect(sanitized.dimensions?.map((d) => d.field)).toEqual([
      "from_lng",
      "from_lat",
      "to_lng",
      "to_lat",
      "route_name",
    ]);
  });
});
