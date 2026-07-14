import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { chartExecuteRequestKey } from "@/lib/chartExecuteProbe";
import { defaultChartConfig } from "@/components/dashboard/layoutUtils";
import { useChartExecute } from "./useChartExecute";

vi.mock("@/lib/chartExecuteProbe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chartExecuteProbe")>();
  return {
    ...actual,
    fetchChartExecuteResult: vi.fn(async () => ({
      columns: ["a"],
      rows: [[1]],
    })),
  };
});

describe("chartExecuteRequestKey", () => {
  it("is stable across object identity changes with the same payload", () => {
    const base = {
      ...defaultChartConfig("line"),
      dataSourceId: "ds-1",
      mode: "sql" as const,
      sql: "SELECT 1",
    };
    const filters = { region: "east" };
    expect(chartExecuteRequestKey({ ...base }, { ...filters })).toBe(
      chartExecuteRequestKey({ ...base }, { ...filters }),
    );
  });
});

describe("useChartExecute", () => {
  it("does not refetch when parent passes new object references with the same query", async () => {
    const { fetchChartExecuteResult } = await import("@/lib/chartExecuteProbe");
    const mockedFetch = vi.mocked(fetchChartExecuteResult);
    mockedFetch.mockClear();

    const base = {
      ...defaultChartConfig("line"),
      chartId: "w1",
      dataSourceId: "ds-1",
      mode: "sql" as const,
      sql: "SELECT 1",
    };
    const filterParameters = { region: "east" };

    const { rerender } = renderHook(
      ({ config, filterParameters: filters }) => useChartExecute(config, { filterParameters: filters }),
      {
        initialProps: {
          config: { ...base },
          filterParameters: { ...filterParameters },
        },
      },
    );

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

    rerender({
      config: { ...base },
      filterParameters: { ...filterParameters },
    });

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
  });
});
