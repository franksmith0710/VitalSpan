import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { D3TableView } from "@/components/charts/engine/d3/table/D3TableView";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import type { ChartViewModel } from "@/components/charts/engine/types";

function renderTable(view: ChartEngineViewProps) {
  return render(
    <TooltipProvider>
      <D3TableView {...view} />
    </TooltipProvider>,
  );
}

function tableProps(
  overrides: Partial<ChartEngineViewProps> = {},
): ChartEngineViewProps {
  const viewModel: ChartViewModel = {
    chartType: "table-info",
    styleVariant: "default",
    engine: "d3",
    encoding: {
      dimensions: [{ field: "region" }],
      metrics: [{ field: "amount", aggregation: "sum" }],
    },
    dataset: {
      columns: ["region", "amount"],
      rows: [["华东", 100], ["华南", 200]],
    },
    source: {},
  };
  return {
    viewModel,
    style: {
      scheme: "light",
      deStyle: {},
      deFeatures: {},
      chartColors: [],
      dataScreenSurface: false,
      showLabel: false,
      showTooltip: true,
      seriesGradient: false,
      depthVisual: "off",
      dataZoom: false,
      labelPresentation: { fontSize: 12 },
      tooltipPresentation: { fontSize: 12 },
      shellLegend: false,
      embedEdit: false,
      tableColorStyle: { headerBg: "#eef2ff", bodyFg: "#211f1f" },
    },
    fill: true,
    chartConfig: {
      chartType: "table-info",
      mode: "sql",
      dataSourceId: "ds",
      dimensions: [{ field: "region" }],
      metrics: [{ field: "amount", aggregation: "sum" }],
    },
    ...overrides,
  };
}

describe("D3TableView table color wiring", () => {
  it("applies dashboard tableColorStyle CSS vars on table host", () => {
    const { container } = renderTable(tableProps());
    const host = container.querySelector(".embedded-chart-table-host") as HTMLElement;
    expect(host).toBeTruthy();
    expect(host.style.getPropertyValue("--dashboard-table-header-bg")).toBe("#eef2ff");
    expect(host.style.getPropertyValue("--dashboard-table-body-fg")).toBe("#211f1f");
  });

  it("component deTableStyle overrides dashboard tableColorStyle", () => {
    const { container } = renderTable(
      tableProps({
        chartConfig: {
          chartType: "table-info",
          mode: "sql",
          dataSourceId: "ds",
          dimensions: [{ field: "region" }],
          metrics: [{ field: "amount", aggregation: "sum" }],
          nativeBody: {
            deTableStyle: { headerBg: "#ff0000" },
          },
        },
      }),
    );
    const host = container.querySelector(".embedded-chart-table-host") as HTMLElement;
    expect(host.style.getPropertyValue("--dashboard-table-header-bg")).toBe("#ff0000");
  });
});
