import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  chartExecuteBindingKey,
  fetchChartExecuteResultShared,
  resetChartExecuteSharedInflight,
} from "@/lib/chartExecuteProbe";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import { patchChartDeStyle } from "@/lib/chartDeStyle";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async () => ({
    columns: ["id"],
    rows: [[1]],
  })),
}));

describe("chartExecuteProbe shared execute", () => {
  beforeEach(() => {
    resetChartExecuteSharedInflight();
    vi.clearAllMocks();
  });

  it("dedupes concurrent requests with the same binding key", async () => {
    const { apiFetch } = await import("@/lib/api");
    const config = {
      ...defaultChartConfig("table"),
      mode: "dataset" as const,
      dataSourceId: "ds-1",
      configId: "cfg-1",
    };

    await Promise.all([
      fetchChartExecuteResultShared(config),
      fetchChartExecuteResultShared(config),
    ]);

    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps binding key stable when only deStyle changes", () => {
    const base = {
      ...defaultChartConfig("bar"),
      mode: "dataset" as const,
      dataSourceId: "ds-1",
      configId: "cfg-1",
    };
    const styled = patchChartDeStyle(base, {
      legend: { show: true },
      title: { show: true, fontSize: 18 },
    });
    expect(chartExecuteBindingKey(base)).toBe(chartExecuteBindingKey(styled));
  });
});
