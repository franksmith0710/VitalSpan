import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayoutWidget } from "../layoutUtils";
import { ChartInspectorProvider } from "../ChartInspectorProvider";
import { ChartGisMapFlowPanel } from "./ChartGisMapFlowPanel";

function gisWidget(): LayoutWidget {
  return {
    id: "w-gis-flow",
    type: "chart",
    title: "GIS",
    order: 1,
    colSpan: 6,
    rowSpan: 4,
    chartConfig: {
      chartType: "gis-map",
      mode: "sql",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      sql: "SELECT 1",
      nativeBody: {
        gisProject: {
          tileServiceId: "planet-z15",
        },
      },
    },
  };
}

function renderPanel(ui: ReactElement, onChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onChange,
    ...render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={gisWidget()} onChange={onChange}>
          {ui}
        </ChartInspectorProvider>
      </QueryClientProvider>,
    ),
  };
}

afterEach(cleanup);

describe("ChartGisMapFlowPanel", () => {
  it("enables flow in gisProject", async () => {
    const onChange = vi.fn();
    renderPanel(<ChartGisMapFlowPanel />, onChange);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("chart-gis-map-flow-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "OD 飞线" }));
    await user.click(screen.getByRole("switch", { name: "启用 OD 飞线" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          nativeBody: expect.objectContaining({
            gisProject: expect.objectContaining({
              flow: expect.objectContaining({ enabled: true }),
            }),
          }),
        }),
      );
    });
  });
});
