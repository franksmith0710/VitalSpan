import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { ChartRenderer } from "./ChartRenderer";

const DS = "00000000-0000-4000-8000-000000000010";
const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

function mockExecute(rows: unknown[][], columns: string[]) {
  mockApiFetch.mockImplementation(async (path: string, opts?: { method?: string; body?: string }) => {
    if (path === "/api/v1/query/execute") {
      return { columns, rows, rowCount: rows.length };
    }
    if (path === "/api/v1/charts/render-spec") {
      const cfg = JSON.parse(opts?.body ?? "{}") as ChartViewConfig;
      return {
        engine: cfg.chartType === "kpi" ? "kpi" : "echarts",
        chartType: cfg.chartType,
        styleVariant: "default",
        encoding: {
          dimensions: cfg.dimensions ?? [],
          metrics: cfg.metrics ?? [],
        },
        source: { mode: "sql", dataSourceId: DS, sql: cfg.sql },
      };
    }
    return {};
  });
}

const cases: Array<{ type: ChartViewConfig["chartType"]; label: string; rows: unknown[][]; cols: string[] }> = [
  { type: "map", label: "地图", rows: [["北京", 100]], cols: ["region", "value"] },
  { type: "heatmap", label: "热力", rows: [["A", "1", 10]], cols: ["x", "y", "v"] },
  { type: "kpi", label: "KPI", rows: [[1280, 12.5]], cols: ["total", "rate"] },
  { type: "timeline", label: "时间轴", rows: [["2026-01-01", 1]], cols: ["t", "v"] },
];

describe("DASH-003 chart render smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it.each(cases)("renders $type container", async ({ type, label, rows, cols }) => {
    mockExecute(rows, cols);
    const config: ChartViewConfig = {
      chartType: type,
      mode: "sql",
      dataSourceId: DS,
      sql: "SELECT 1",
      dimensions: type === "kpi" ? [] : [{ field: cols[0] }],
      metrics: type === "kpi"
        ? [{ field: "total" }, { field: "rate" }]
        : [{ field: cols[cols.length - 1] }],
    };
    render(<ChartRenderer config={config} title={label} mode="preview" />);
    await waitFor(() => {
      expect(screen.queryByLabelText("图表加载中")).not.toBeInTheDocument();
    });
    expect(screen.getByText(label)).toBeInTheDocument();
    if (type === "kpi") {
      expect(screen.getByRole("group", { name: /指标/ })).toBeInTheDocument();
    }
  });
});
