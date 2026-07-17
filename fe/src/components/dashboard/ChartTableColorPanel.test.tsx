import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartTableColorPanel } from "./ChartTableColorPanel";
import { ChartInspectorProvider } from "./ChartInspectorProvider";
import type { LayoutWidget } from "./layoutUtils";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn().mockResolvedValue({ items: [] }) };
});

vi.mock("@/lib/chartRegistry", () => ({
  fetchChartTypeCatalog: vi.fn().mockResolvedValue([]),
}));

const tableWidget: LayoutWidget = {
  id: "w-table",
  type: "chart",
  title: "明细表",
  order: 1,
  colSpan: 6,
  rowSpan: 4,
  chartConfig: {
    chartType: "table",
    styleVariant: "default",
    mode: "sql",
    dataSourceId: "00000000-0000-4000-8000-000000000001",
    sql: "SELECT 1",
    dimensions: [{ field: "region" }],
    metrics: [],
  },
};

afterEach(cleanup);

describe("ChartTableColorPanel", () => {
  it("renders DE-aligned table color fields", () => {
    const onChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={tableWidget} onChange={onChange}>
          <ChartTableColorPanel />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("table-style-color")).toBeInTheDocument();
    expect(screen.getByText("表头/行背景")).toBeInTheDocument();
    expect(screen.getByText("表头字体")).toBeInTheDocument();
    expect(screen.getByText("表格背景")).toBeInTheDocument();
    expect(screen.getByText("表格字体")).toBeInTheDocument();
    expect(screen.getByText("分页器")).toBeInTheDocument();
  });
});
