import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayoutWidget } from "../layoutUtils";
import { ChartInspectorProvider } from "../ChartInspectorProvider";
import { ChartGisMapProjectPanel } from "./ChartGisMapProjectPanel";
import { registerGisMapViewCapture } from "@/components/charts/engine/maplibre/gisMapViewBridge";

vi.mock("@/lib/tileServices", () => ({
  listTileServices: vi.fn(async () => [
    { id: "planet-z15", name: "Planet Z15", enabled: true },
  ]),
}));

function gisWidget(): LayoutWidget {
  return {
    id: "w-gis",
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
          projection: "globe",
          atmospherePreset: "night",
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

describe("ChartGisMapProjectPanel atmosphere wiring", () => {
  it("switches atmosphere preset to day in gisProject", async () => {
    const onChange = vi.fn();
    renderPanel(<ChartGisMapProjectPanel />, onChange);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("chart-gis-map-project-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "GIS 底图" }));
    await user.click(screen.getByRole("combobox", { name: "大气预设" }));
    await user.click(screen.getByRole("option", { name: "白昼" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          nativeBody: expect.objectContaining({
            gisProject: expect.objectContaining({
              atmospherePreset: "day",
            }),
          }),
        }),
      );
    });
  });
});

describe("ChartGisMapProjectPanel initial view", () => {
  it("debounces zoom edits into gisProject.view", async () => {
    const onChange = vi.fn();
    renderPanel(<ChartGisMapProjectPanel />, onChange);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("chart-gis-map-project-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "GIS 底图" }));
    const zoomField = screen.getByRole("textbox", { name: "缩放" });
    await user.clear(zoomField);
    await user.type(zoomField, "4");

    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            nativeBody: expect.objectContaining({
              gisProject: expect.objectContaining({
                view: expect.objectContaining({ zoom: 4 }),
              }),
            }),
          }),
        );
      },
      { timeout: 1500 },
    );
  });

  it("captures live map camera into gisProject.view", async () => {
    const dispose = registerGisMapViewCapture("w-gis", () => ({
      center: [116.4, 39.9],
      zoom: 8,
      bearing: 10,
      pitch: 30,
    }));
    const onChange = vi.fn();
    renderPanel(<ChartGisMapProjectPanel />, onChange);
    const user = userEvent.setup();

    try {
      await waitFor(() => {
        expect(screen.getByTestId("chart-gis-map-project-panel")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "GIS 底图" }));
      await user.click(screen.getByRole("button", { name: "读取当前视角" }));

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            nativeBody: expect.objectContaining({
              gisProject: expect.objectContaining({
                view: {
                  center: [116.4, 39.9],
                  zoom: 8,
                  bearing: 10,
                  pitch: 30,
                },
              }),
            }),
          }),
        );
      });
    } finally {
      dispose();
    }
  });
});
