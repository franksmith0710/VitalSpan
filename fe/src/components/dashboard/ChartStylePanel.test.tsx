import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartStylePanel } from "./ChartStylePanel";
import { ChartInspectorProvider } from "./ChartInspectorContext";
import type { LayoutWidget } from "./layoutUtils";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiFetch: vi.fn().mockResolvedValue({ items: [] }),
  };
});

vi.mock("@/lib/chartRegistry", () => ({
  fetchChartTypeCatalog: vi.fn().mockResolvedValue([
    {
      type: "bar",
      displayName: "柱状图",
      category: "basic",
      renderer: "echarts",
      styleVariants: ["default", "stacked"],
      fieldRule: {},
    },
  ]),
}));

const widget: LayoutWidget = {
  id: "w1",
  type: "chart",
  title: "销售趋势",
  order: 1,
  colSpan: 6,
  rowSpan: 4,
  chartConfig: {
    chartType: "bar",
    styleVariant: "default",
    mode: "sql",
    dataSourceId: "00000000-0000-4000-8000-000000000001",
    sql: "SELECT 1",
    dimensions: [{ field: "region" }],
    metrics: [{ field: "amount" }],
  },
};

afterEach(cleanup);

describe("ChartStylePanel", () => {
  it("renders DE-style accordion sections and patches style variant", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={widget} onChange={onChange}>
          <ChartStylePanel />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: "基础样式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "配色方案" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "标题" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "图例" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "标签" })).toBeInTheDocument();

    await user.click(screen.getByLabelText("样式子类型"));
    await user.click(screen.getByRole("option", { name: "stacked" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ styleVariant: "stacked" }),
    );
  });
});
