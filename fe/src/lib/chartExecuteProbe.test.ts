import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  chartExecuteBindingKey,
  fetchChartExecuteResult,
  fetchChartExecuteResultShared,
  isChartExecuteReady,
  resolveChartExecuteMode,
  resetChartExecuteSharedInflight,
} from "@/lib/chartExecuteProbe";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import { patchChartDeStyle } from "@/lib/chartDeStyle";

const apiFetchMock = vi.fn(async () => ({
  columns: ["id"],
  rows: [[1]],
}));

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe("chartExecuteProbe shared execute", () => {
  beforeEach(() => {
    resetChartExecuteSharedInflight();
    apiFetchMock.mockClear();
  });

  it("infers sql mode when layout has sql without mode field", async () => {
    const config = {
      ...defaultChartConfig("line"),
      dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
      sql: "SELECT 1",
    };
    delete (config as { mode?: string }).mode;

    expect(resolveChartExecuteMode(config)).toBe("sql");
    expect(isChartExecuteReady(config)).toBe(true);

    await fetchChartExecuteResult(config);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/query/execute",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"mode":"sql"'),
      }),
    );
  });

  it("does not call api when execute is not ready", async () => {
    const config = {
      ...defaultChartConfig("line"),
      mode: "sql" as const,
      dataSourceId: "",
      sql: "",
    };

    await expect(fetchChartExecuteResult(config)).rejects.toThrow("请配置数据源与 SQL");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("dedupes concurrent requests with the same binding key", async () => {
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

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
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
