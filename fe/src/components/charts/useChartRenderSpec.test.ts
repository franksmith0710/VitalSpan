import { type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { useChartRenderSpec, clearChartRenderSpecCacheForTests } from "./useChartRenderSpec";

const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const funnelConfig: ChartViewConfig = {
  chartType: "funnel",
  dataSourceId: "00000000-0000-4000-8000-000000000001",
  mode: "sql",
  sql: "SELECT 1",
  dimensions: [{ field: "stage" }],
  metrics: [{ field: "value" }],
};

const spec = {
  engine: "echarts",
  chartType: "funnel",
  styleVariant: "default",
  encoding: { dimensions: [{ field: "stage" }], metrics: [{ field: "value" }] },
  source: {},
};

describe("useChartRenderSpec", () => {
  afterEach(() => {
    mockApiFetch.mockReset();
    clearChartRenderSpecCacheForTests();
  });

  it("fetches once per stable config key", async () => {
    mockApiFetch.mockResolvedValue(spec);
    const { result, rerender } = renderHook(
      ({ config, loading }) => useChartRenderSpec(config, { loading }),
      { initialProps: { config: funnelConfig, loading: false } },
    );

    await waitFor(() => expect(result.current).toEqual(spec));
    expect(mockApiFetch).toHaveBeenCalledTimes(1);

    rerender({ config: { ...funnelConfig }, loading: false });
    await waitFor(() => expect(result.current).toEqual(spec));
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while paused", async () => {
    mockApiFetch.mockResolvedValue(spec);
    const { result, rerender } = renderHook(
      ({ paused, loading }) =>
        useChartRenderSpec(funnelConfig, { paused, loading: loading ?? false }),
      { initialProps: { paused: true, loading: false as boolean | undefined } },
    );

    await waitFor(() => expect(mockApiFetch).not.toHaveBeenCalled());
    expect(result.current).toBeNull();

    rerender({ paused: false, loading: false });
    await waitFor(() => expect(result.current).toEqual(spec));
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});
