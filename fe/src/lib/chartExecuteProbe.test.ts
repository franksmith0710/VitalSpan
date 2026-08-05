import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFilterParameters,
  chartExecuteBindingKey,
  fetchChartExecuteResult,
  fetchChartExecuteResultShared,
  isChartExecuteReady,
  resolveChartExecuteMode,
  resetChartExecuteSharedInflight,
} from "@/lib/chartExecuteProbe";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import { patchChartDeStyle } from "@/lib/chartDeStyle";
import { buildChartRenderModel } from "@/lib/buildChartRenderModel";
import { CHART_CATALOG_SMOKE_CASES, smokeCaseToConfig } from "@/components/charts/chartCatalogSmokeFixtures";

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

  describe("GAP-FILTER-CHAIN: inspector filters → execute SQL → render model", () => {
    it("buildFilterParameters maps ChartConfigPanel filter rows to SQL placeholders", () => {
      const params = buildFilterParameters([
        { field: "region_name", operator: "eq", value: "华东" },
        { field: "sale_date", operator: "in", value: ["2025-01", "2025-02"] },
      ]);
      expect(params).toEqual({
        filter_region_name_0: "华东",
        filter_sale_date_1: "2025-01,2025-02",
      });
    });

    it("chartExecuteBindingKey changes when filters change (cache invalidation)", () => {
      const base = {
        ...defaultChartConfig("line"),
        mode: "sql" as const,
        dataSourceId: "ds-1",
        sql: "SELECT * FROM t WHERE region = {{filter_region_name_0}}",
        filters: [{ field: "region_name", operator: "eq" as const, value: "华东" }],
      };
      const filtered = {
        ...base,
        filters: [{ field: "region_name", operator: "eq" as const, value: "华北" }],
      };
      expect(chartExecuteBindingKey(base)).not.toBe(chartExecuteBindingKey(filtered));
    });

    it("fetchChartExecuteResult injects filter parameters into SQL body", async () => {
      const config = {
        ...defaultChartConfig("line"),
        mode: "sql" as const,
        dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        sql: "SELECT region_name, amount FROM sales WHERE region_name = {{filter_region_name_0}}",
        filters: [{ field: "region_name", operator: "eq" as const, value: "华东" }],
      };

      await fetchChartExecuteResult(config);

      const body = JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body));
      expect(body.sql).toContain("region_name = 华东");
      expect(body.sql).not.toContain("{{filter_region_name_0}}");
    });

    it("filtered execute result yields different render row count than unfiltered", () => {
      const lineCase = CHART_CATALOG_SMOKE_CASES.find((c) => c.type === "line")!;
      const config = smokeCaseToConfig(lineCase);
      const columns = [...lineCase.columns];
      const allRows = lineCase.rows as (string | number | boolean | null)[][];
      const filteredRows = allRows.filter((row) => row[1] === "华东");

      const allModel = buildChartRenderModel(config, columns, allRows);
      const filteredModel = buildChartRenderModel(config, columns, filteredRows);

      expect(allModel.kind).toBe("ready");
      expect(filteredModel.kind).toBe("ready");
      expect(allRows.length).toBe(3);
      expect(filteredRows.length).toBe(1);
    });
  });
});
