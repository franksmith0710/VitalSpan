import { describe, expect, it } from "vitest";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import {
  isWidgetConfigReady,
  reconcileChartFields,
  resolveChartConfigPhase,
} from "./chartConfigState";

describe("chartConfigState", () => {
  it("aligns widget ready with execute ready for dataset mode", () => {
    const ready = {
      ...defaultChartConfig("line"),
      mode: "dataset" as const,
      dataSourceId: "ds-1",
      configId: "cfg-1",
    };
    expect(isWidgetConfigReady(ready)).toBe(true);
    expect(resolveChartConfigPhase(ready).queryReady).toBe(true);
  });

  it("stays widget-ready after enabling deFeatures markLines", () => {
    const withFeatures = {
      ...defaultChartConfig("bar-group"),
      mode: "dataset" as const,
      dataSourceId: "ds-1",
      configId: "cfg-1",
      nativeBody: {
        deFeatures: {
          markLines: [{ id: "l1", enabled: true, axis: "y" as const, value: 100 }],
        },
      },
    };
    expect(isWidgetConfigReady(withFeatures)).toBe(true);
  });

  it("requires configId for dataset binding ready", () => {
    const partial = {
      ...defaultChartConfig("line"),
      mode: "dataset" as const,
      dataSourceId: "ds-1",
      datasetId: "dset-1",
    };
    expect(isWidgetConfigReady(partial)).toBe(false);
  });

  it("reconcile strips fields absent from columns", () => {
    const config = {
      ...defaultChartConfig("bar"),
      dimensions: [{ field: "old" }],
      metrics: [{ field: "amount" }],
    };
    const next = reconcileChartFields(config, ["amount"]);
    expect(next.dimensions).toEqual([{ field: "" }]);
    expect(next.metrics).toEqual([{ field: "amount" }]);
  });

  it("line chart is renderReady with category + metric only (optional slots empty)", () => {
    const config = {
      ...defaultChartConfig("line"),
      mode: "dataset" as const,
      dataSourceId: "ds-1",
      configId: "cfg-1",
      dimensions: [{ field: "sale_date" }],
      metrics: [{ field: "amount" }],
    };
    expect(resolveChartConfigPhase(config).renderReady).toBe(true);
  });
});
