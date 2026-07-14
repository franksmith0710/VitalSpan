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
});
