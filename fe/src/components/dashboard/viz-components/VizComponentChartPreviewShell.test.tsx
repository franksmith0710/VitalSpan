import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VizComponentChartPreviewShell } from "@/components/dashboard/viz-components/VizComponentChartPreviewShell";
import { defaultChartConfig, type LayoutWidget } from "@/components/dashboard/layoutUtils";
import { patchChartDeStyleNested } from "@/lib/chartDeStyle";

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

  it("renders decorative frame overlay from deStyle background", () => {
    const widget: LayoutWidget = {
      id: "vc-edit-2",
      type: "chart",
      title: "带边框",
      colSpan: 12,
      rowSpan: 8,
      order: 0,
      chartConfig: patchChartDeStyleNested(defaultChartConfig("line"), "background", {
        backgroundShow: true,
        backgroundMode: "frame",
        framePresetId: "frame-2",
        frameColor: "#ff0000",
      }),
    };

    render(
      <VizComponentChartPreviewShell
        widget={widget as LayoutWidget & { chartConfig: NonNullable<typeof widget.chartConfig> }}
      >
        <div>chart</div>
      </VizComponentChartPreviewShell>,
    );

    const frame = screen.getByTestId("viz-chart-shell-frame-0");
    expect(frame.style.backgroundImage).toContain("data:image/svg+xml");
  });
});
