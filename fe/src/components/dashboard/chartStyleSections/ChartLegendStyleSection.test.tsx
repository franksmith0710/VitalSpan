import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartInspectorProvider } from "../ChartInspectorProvider";
import type { LayoutWidget } from "../layoutUtils";
import { ChartLegendStyleSection } from "./ChartCommonStyleSections";

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

describe("ChartLegendStyleSection", () => {
  it("switch is on by default in embedded chart inspector", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={widget} onChange={vi.fn()} dashboardStyle={{}}>
          <ChartLegendStyleSection />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("switch", { name: "显示图例" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText("字号")).toBeInTheDocument();
    expect(screen.getByText("位置")).toBeInTheDocument();
  });

  it("hides legend fields when legend is disabled", () => {
    const widgetLegendOff: LayoutWidget = {
      ...widget,
      chartConfig: {
        ...widget.chartConfig!,
        nativeBody: { deStyle: { legend: { show: false } } },
      },
    };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={widgetLegendOff} onChange={vi.fn()} dashboardStyle={{}}>
          <ChartLegendStyleSection />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("switch", { name: "显示图例" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.queryByText("字号")).not.toBeInTheDocument();
    expect(screen.queryByText("位置")).not.toBeInTheDocument();
  });

  it("patches per-chart legend.show when toggled off", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const widgetWithLegend: LayoutWidget = {
      ...widget,
      chartConfig: {
        ...widget.chartConfig!,
        nativeBody: { deStyle: { legend: { show: true } } },
      },
    };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={widgetWithLegend} onChange={onChange} dashboardStyle={{}}>
          <ChartLegendStyleSection />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("switch", { name: "显示图例" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeBody: expect.objectContaining({
          deStyle: expect.objectContaining({
            legend: expect.objectContaining({ show: false }),
          }),
        }),
      }),
    );
  });
});
