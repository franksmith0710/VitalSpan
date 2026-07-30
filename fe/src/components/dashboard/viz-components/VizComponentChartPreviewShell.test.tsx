import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VizComponentChartPreviewShell } from "@/components/dashboard/viz-components/VizComponentChartPreviewShell";
import { defaultChartConfig, type LayoutWidget } from "@/components/dashboard/layoutUtils";

describe("VizComponentChartPreviewShell", () => {
  it("renders grid widget border chrome like dashboard view", () => {
    const widget: LayoutWidget = {
      id: "vc-edit-1",
      type: "chart",
      title: "销量趋势",
      colSpan: 12,
      rowSpan: 8,
      order: 0,
      chartConfig: defaultChartConfig("line"),
    };

    render(
      <VizComponentChartPreviewShell
        widget={widget as LayoutWidget & { chartConfig: NonNullable<typeof widget.chartConfig> }}
      >
        <div data-testid="chart-body">chart</div>
      </VizComponentChartPreviewShell>,
    );

    const shell = screen.getByTestId("viz-component-chart-shell");
    expect(shell.className).toContain("rounded-xl");
    expect(shell.className).toContain("border");
    expect(screen.getByTestId("chart-body")).toBeInTheDocument();
  });
});
