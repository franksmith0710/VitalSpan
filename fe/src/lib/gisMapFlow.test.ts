import { describe, expect, it } from "vitest";
import { applyGisMapFlowConfig, isGisMapFlowConfig } from "@/lib/gisMapFlow";
import { applyGisMapScatterConfig } from "@/lib/gisMapScatter";
import { fieldAtSlot } from "@/lib/resolveChartEncoding";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("gisMapFlow lib", () => {
  it("binds from/to slots and enables flow", () => {
    const cfg: ChartViewConfig = { chartType: "gis-map" };
    const next = applyGisMapFlowConfig(cfg, "00000000-0000-4000-8000-000000000099");
    expect(next.dimensions?.map((d) => d.field)).toEqual([
      "from_lng",
      "from_lat",
      "to_lng",
      "to_lat",
      "route_name",
    ]);
    expect(next.metrics?.[0]?.field).toBe("weight");
    expect(next.nativeBody?.gisProject?.flow?.enabled).toBe(true);
    expect(isGisMapFlowConfig(next)).toBe(true);
  });

  it("replaces scatter axes when switching from scatter preset", () => {
    const scatter = applyGisMapScatterConfig({ chartType: "gis-map" }, "sample-ds");
    expect(scatter.dimensions?.[0]?.field).toBe("lng");

    const flow = applyGisMapFlowConfig(scatter, "sample-ds");
    expect(flow.dimensions?.map((d) => d.field)).toEqual([
      "from_lng",
      "from_lat",
      "to_lng",
      "to_lat",
      "route_name",
    ]);
    expect(fieldAtSlot(flow, { axisId: "xAxis", index: 0 })).toBe("from_lng");
    expect(fieldAtSlot(flow, { axisId: "drill", index: 0 })).toBe("to_lng");
    expect(isGisMapFlowConfig(flow)).toBe(true);
  });
});
