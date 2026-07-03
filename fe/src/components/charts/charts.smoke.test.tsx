import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ChartRenderer } from "./ChartRenderer";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("react-apexcharts", () => ({
  default: () => <div data-testid="apex-chart-container" />,
}));

const tableConfig: ChartViewConfig = {
  chartType: "table",
  dataSourceId: "00000000-0000-4000-8000-000000000001",
  mode: "sql",
  sql: "SELECT 1 AS id",
};

describe("ChartRenderer smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("T-VIZ-R28-002-01: table renders headers and cells", async () => {
    mockApiFetch.mockResolvedValueOnce({ columns: ["id"], rows: [[1]] });
    render(<ChartRenderer config={tableConfig} title="表" />);
    expect(await screen.findByText("id")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("T-VIZ-R28-002-03: empty rows shows 暂无数据", async () => {
    mockApiFetch.mockResolvedValueOnce({ columns: ["id"], rows: [] });
    render(<ChartRenderer config={tableConfig} />);
    expect(await screen.findByText("暂无数据")).toBeInTheDocument();
  });

  it("T-VIZ-R28-002-04: execute error shows retry", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("查询失败"));
    render(<ChartRenderer config={tableConfig} />);
    expect(await screen.findByText("查询失败")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("T-VIZ-R28-002-05: line chart renders apex container", async () => {
    mockApiFetch.mockResolvedValueOnce({ columns: ["x", "y"], rows: [[1, 2]] });
    const lineConfig: ChartViewConfig = {
      chartType: "line",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1 AS x, 2 AS y",
      dimensions: [{ field: "x" }],
      metrics: [{ field: "y" }],
    };
    render(<ChartRenderer config={lineConfig} />);
    expect(await screen.findByTestId("apex-chart-container")).toBeInTheDocument();
  });
});
