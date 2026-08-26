import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayoutWidget } from "../layoutUtils";
import { ChartInspectorProvider } from "../ChartInspectorProvider";
import { ChartGisMapFlowPanel } from "./ChartGisMapFlowPanel";
import { DEFAULT_GIS_FLOW } from "@/components/charts/engine/maplibre/gisProject";

function gisWidget(flow?: { enabled?: boolean; color?: string; opacity?: number }): LayoutWidget {
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
          flow,
        },
      },
    },
  };
}

function renderPanel(ui: ReactElement, widget = gisWidget(), onChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onChange,
    ...render(
      <QueryClientProvider client={qc}>
        <ChartInspectorProvider widget={widget} onChange={onChange}>
          {ui}
        </ChartInspectorProvider>
      </QueryClientProvider>,
    ),
  };
}

async function openFlowPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "OD 飞线" }));
  await user.click(screen.getByRole("switch", { name: "启用 OD 飞线" }));
}

afterEach(cleanup);

describe("ChartGisMapFlowPanel", () => {
  it("enables flow in gisProject", async () => {
    const onChange = vi.fn();
    renderPanel(<ChartGisMapFlowPanel />, gisWidget(), onChange);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("chart-gis-map-flow-panel")).toBeInTheDocument();
    });

    await openFlowPanel(user);

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

  it("writes scaleByMetric false to gisProject.flow", async () => {
    const onChange = vi.fn();
    renderPanel(<ChartGisMapFlowPanel />, gisWidget({ enabled: true }), onChange);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("chart-gis-map-flow-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "OD 飞线" }));
    await user.click(screen.getByRole("switch", { name: "按流量缩放线宽" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          nativeBody: expect.objectContaining({
            gisProject: expect.objectContaining({
              flow: expect.objectContaining({ scaleByMetric: false }),
            }),
          }),
        }),
      );
    });
  });

  it("writes autoFit false to gisProject.flow", async () => {
    const onChange = vi.fn();
    renderPanel(<ChartGisMapFlowPanel />, gisWidget({ enabled: true }), onChange);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("chart-gis-map-flow-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "OD 飞线" }));
    await user.click(screen.getByRole("switch", { name: "有飞线时自动定位" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          nativeBody: expect.objectContaining({
            gisProject: expect.objectContaining({
              flow: expect.objectContaining({ autoFit: false }),
            }),
          }),
        }),
      );
    });
  });

  it("resets flow paint to defaults while keeping enabled", async () => {
    const onChange = vi.fn();
    renderPanel(
      <ChartGisMapFlowPanel />,
      gisWidget({ enabled: true, color: "#ff0000", opacity: 0.5 }),
      onChange,
    );
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("chart-gis-map-flow-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "OD 飞线" }));
    await user.click(screen.getByRole("button", { name: /恢复默认/ }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          nativeBody: expect.objectContaining({
            gisProject: expect.objectContaining({
              flow: expect.objectContaining({
                enabled: true,
                widthMin: DEFAULT_GIS_FLOW.widthMin,
                widthMax: DEFAULT_GIS_FLOW.widthMax,
              }),
            }),
          }),
        }),
      );
    });
  });
});
