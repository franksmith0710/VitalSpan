import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartTableStylePanel } from "./ChartTableStylePanel";
import { ChartInspectorProvider } from "./ChartInspectorProvider";
import { patchChartDeTableStyle } from "@/lib/chartDeTableStyle";
import type { LayoutWidget } from "./layoutUtils";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn().mockResolvedValue({ items: [] }) };
});

vi.mock("@/lib/chartRegistry", () => ({
  fetchChartTypeCatalog: vi.fn().mockResolvedValue([]),
  getChartTypeDisplayName: (type: string) => type,
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
    dimensions: [{ field: "region" }, { field: "amount" }],
    metrics: [],
  },
};

afterEach(cleanup);

describe("ChartTableStylePanel", () => {
  it("renders DE-aligned basic style fields in one collapse", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={tableWidget} onChange={onChange}>
          <ChartTableStylePanel />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /明细表（旧） · 基础样式/ }));

    expect(screen.getByTestId("table-style-basic")).toBeInTheDocument();
    expect(screen.getByText("不透明度 %")).toBeInTheDocument();
    expect(screen.getByText("边框颜色")).toBeInTheDocument();
    expect(screen.getByText("滚动条颜色")).toBeInTheDocument();
    expect(screen.getByText("分页模式")).toBeInTheDocument();
    expect(screen.getByText("列宽调整")).toBeInTheDocument();
    expect(screen.getByText("自动换行")).toBeInTheDocument();
    expect(screen.getByText("显示汇总行")).toBeInTheDocument();
    expect(screen.getByText("显示鼠标悬浮样式")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "自定义" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeBody: expect.objectContaining({
          deTableStyle: expect.objectContaining({ columnWidthMode: "custom" }),
        }),
      }),
    );
  });

  it("switching to auto clears incompatible column width state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const widget = {
      ...tableWidget,
      chartConfig: patchChartDeTableStyle(tableWidget.chartConfig!, {
        columnWidthMode: "custom",
        columnWidthsPx: { region: 200 },
        columnWidths: { region: 100 },
      }),
    };
    render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={widget} onChange={onChange}>
          <ChartTableStylePanel />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: /明细表（旧） · 基础样式/ }));
    await user.click(screen.getByRole("button", { name: "自适应" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeBody: expect.objectContaining({
          deTableStyle: expect.objectContaining({
            columnWidthMode: "auto",
            columnWidths: undefined,
            columnWidthsPx: undefined,
          }),
        }),
      }),
    );
  });
});
