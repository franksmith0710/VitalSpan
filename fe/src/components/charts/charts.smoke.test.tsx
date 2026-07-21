import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ChartRenderer } from "./ChartRenderer";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

const tableConfig: ChartViewConfig = {
  chartType: "table-info",
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

  it("T-VIZ-R28-002-05: line chart renders d3 container", async () => {
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
    expect(await screen.findByTestId("d3-line-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R29-002-01: table-info renders s2 host with capped visible rows", async () => {
    const rows = Array.from({ length: 101 }, (_, i) => [i + 1]);
    mockApiFetch.mockResolvedValueOnce({ columns: ["id"], rows });
    render(<ChartRenderer config={tableConfig} title="大表" />);
    expect(await screen.findByTestId("antv-s2-chart")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getAllByRole("cell").length).toBeLessThanOrEqual(50);
  });

  it("T-VIZ-R29-002-02: QUERY_TIMEOUT shows Chinese timeout message", async () => {
    const err = Object.assign(new Error("查询超时，请缩小数据范围"), { code: "QUERY_TIMEOUT" });
    mockApiFetch.mockRejectedValueOnce(err);
    render(<ChartRenderer config={tableConfig} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("查询超时，请缩小数据范围");
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("T-VIZ-R29-002-03: bar chart smoke renders antv container", async () => {
    mockApiFetch.mockResolvedValueOnce({ columns: ["x", "y"], rows: [[1, 2]] });
    const barConfig: ChartViewConfig = {
      chartType: "bar",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1 AS x, 2 AS y",
      dimensions: [{ field: "x" }],
      metrics: [{ field: "y" }],
    };
    render(<ChartRenderer config={barConfig} />);
    expect(await screen.findByTestId("antv-g2plot-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R29-002-04: table-normal renders s2 host", async () => {
    mockApiFetch.mockResolvedValueOnce({
      columns: ["region", "amount"],
      rows: [
        ["华东", 10],
        ["华北", 20],
      ],
    });
    const config: ChartViewConfig = {
      chartType: "table-normal",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT region, amount FROM t GROUP BY region",
      dimensions: [{ field: "region" }],
      metrics: [{ field: "amount" }],
    };
    render(<ChartRenderer config={config} />);
    expect(await screen.findByTestId("antv-s2-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R29-002-05: table-pivot renders s2 host", async () => {
    mockApiFetch.mockResolvedValueOnce({
      columns: ["row_dim", "col_dim", "amount"],
      rows: [["A", "X", 1]],
    });
    const config: ChartViewConfig = {
      chartType: "table-pivot",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT row_dim, col_dim, amount FROM t",
      dimensions: [{ field: "row_dim" }, { field: "col_dim" }],
      metrics: [{ field: "amount" }],
    };
    render(<ChartRenderer config={config} />);
    expect(await screen.findByTestId("antv-s2-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R29-002-06: t-heatmap renders g2plot host", async () => {
    mockApiFetch.mockResolvedValueOnce({
      columns: ["x", "y", "value"],
      rows: [
        ["a", "1", 10],
        ["b", "2", 20],
      ],
    });
    const config: ChartViewConfig = {
      chartType: "t-heatmap",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT x, y, value FROM t",
      dimensions: [{ field: "x" }, { field: "y" }],
      metrics: [{ field: "value" }],
    };
    render(<ChartRenderer config={config} />);
    expect(await screen.findByTestId("antv-g2plot-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R29-002-07: bar conditional rules wire columnStyle", async () => {
    mockApiFetch.mockResolvedValueOnce({
      columns: ["x", "y"],
      rows: [
        [1, 10],
        [2, 30],
      ],
    });
    const barConfig: ChartViewConfig = {
      chartType: "bar",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1 AS x, 2 AS y",
      dimensions: [{ field: "x" }],
      metrics: [{ field: "y" }],
      nativeBody: {
        deFeatures: {
          conditionalRules: [
            { id: "r1", enabled: true, operator: "gte", value: 20, color: "#12b76a" },
          ],
        },
      },
    };
    render(<ChartRenderer config={barConfig} />);
    expect(await screen.findByTestId("antv-g2plot-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R29-002-08: table-info compact pagination footer", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => [i + 1]);
    mockApiFetch.mockResolvedValueOnce({ columns: ["id"], rows });
    render(
      <ChartRenderer
        config={{
          ...tableConfig,
          nativeBody: {
            deTableStyle: {
              paginationMode: "page",
              pageSize: 20,
              paginationVariant: "compact",
            },
          },
        }}
      />,
    );
    expect(await screen.findByTestId("antv-s2-chart")).toBeInTheDocument();
    expect(await screen.findByTestId("table-pagination-compact")).toBeInTheDocument();
  });
});
