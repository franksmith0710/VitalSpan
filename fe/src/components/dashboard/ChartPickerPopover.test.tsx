import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartPickerPopover } from "./ChartPickerPopover";
import { DASHBOARD_CHART_DND_TYPE, DASHBOARD_CUSTOM_VIZ_DND_TYPE } from "@/lib/dashboardDnd";

vi.mock("@/lib/chartRegistry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chartRegistry")>();
  return {
    ...actual,
    fetchChartTypeCatalog: vi.fn(async () => [
      { type: "line", displayName: "基础折线图", library: "d3", paletteCategory: "trend" },
    ]),
  };
});

vi.mock("@/lib/aiVizArtifacts", () => ({
  fetchAiVizArtifacts: vi.fn(async () => ({
    items: [
      {
        artifactId: "art-custom-1",
        manifest: { displayName: "演示排名条", id: "ranking-strip" },
        status: "active",
        contentHash: "abc",
      },
      {
        artifactId: "0833b30b-39d4-4a58-80f6-030de7cbe377",
        manifest: { displayName: "排名条(带序号)-降序", id: "ranking-bar-medal-v1" },
        status: "active",
        contentHash: "medal",
      },
    ],
  })),
}));

vi.stubGlobal(
  "IntersectionObserver",
  vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })),
);

function renderPicker(props: Partial<ComponentProps<typeof ChartPickerPopover>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ChartPickerPopover onInsert={vi.fn()} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("ChartPickerPopover drag", () => {
  it("keeps drag payload and notifies drag session callbacks", async () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    renderPicker({ onPaletteDragStart: onDragStart, onPaletteDragEnd: onDragEnd });

    const popover = await screen.findByTestId("chart-picker-popover");
    const tile = await within(popover).findByRole("button", { name: /基础折线图/i });
    expect(tile.querySelector("svg")).toBeTruthy();
    const transfer = {
      types: [] as string[],
      effectAllowed: "none",
      setData(type: string, value: string) {
        this.types.push(type);
        (this as { _data?: Record<string, string> })._data = {
          ...(this as { _data?: Record<string, string> })._data,
          [type]: value,
        };
      },
      getData(type: string) {
        return (this as { _data?: Record<string, string> })._data?.[type] ?? "";
      },
    };

    fireEvent.dragStart(tile, { dataTransfer: transfer });
    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(transfer.types).toContain(DASHBOARD_CHART_DND_TYPE);
    expect(transfer.getData(DASHBOARD_CHART_DND_TYPE)).toBe("line");

    fireEvent.dragEnd(tile);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});

describe("ChartPickerPopover custom viz", () => {
  it("shows 自定义 nav and artifact tile when onInsertCustomViz is provided", async () => {
    const onInsertCustomViz = vi.fn();
    renderPicker({ onInsertCustomViz });
    const popover = await screen.findByTestId("chart-picker-popover");

    expect(await within(popover).findByRole("button", { name: "自定义" })).toBeInTheDocument();
    expect(await within(popover).findByTestId("custom-viz-tile-art-custom-1")).toBeInTheDocument();
    expect(
      await within(popover).findByTestId("custom-viz-tile-0833b30b-39d4-4a58-80f6-030de7cbe377"),
    ).toBeInTheDocument();
  });

  it("calls onInsertCustomViz when custom tile is clicked", async () => {
    const onInsertCustomViz = vi.fn();
    const user = userEvent.setup();
    renderPicker({ onInsertCustomViz });
    const popover = await screen.findByTestId("chart-picker-popover");

    await user.click(await within(popover).findByTestId("custom-viz-tile-art-custom-1"));
    expect(onInsertCustomViz).toHaveBeenCalledWith({
      type: "customViz",
      artifactId: "art-custom-1",
      displayName: "演示排名条",
    });
  });

  it("calls onInsertCustomViz when ranking bar medal tile is clicked", async () => {
    const onInsertCustomViz = vi.fn();
    const user = userEvent.setup();
    renderPicker({ onInsertCustomViz });
    const popover = await screen.findByTestId("chart-picker-popover");

    await user.click(
      await within(popover).findByTestId("custom-viz-tile-0833b30b-39d4-4a58-80f6-030de7cbe377"),
    );
    expect(onInsertCustomViz).toHaveBeenCalledWith({
      type: "customViz",
      artifactId: "0833b30b-39d4-4a58-80f6-030de7cbe377",
      displayName: "排名条(带序号)-降序",
    });
  });

  it("sets custom viz drag payload on dragStart", async () => {
    renderPicker({ onInsertCustomViz: vi.fn() });
    const popover = await screen.findByTestId("chart-picker-popover");
    const tile = await within(popover).findByTestId("custom-viz-tile-art-custom-1");
    const transfer = {
      types: [] as string[],
      effectAllowed: "none",
      setData(type: string, value: string) {
        this.types.push(type);
        (this as { _data?: Record<string, string> })._data = {
          ...(this as { _data?: Record<string, string> })._data,
          [type]: value,
        };
      },
      getData(type: string) {
        return (this as { _data?: Record<string, string> })._data?.[type] ?? "";
      },
    };

    fireEvent.dragStart(tile, { dataTransfer: transfer });
    expect(transfer.types).toContain(DASHBOARD_CUSTOM_VIZ_DND_TYPE);
    expect(JSON.parse(transfer.getData(DASHBOARD_CUSTOM_VIZ_DND_TYPE))).toEqual({
      type: "customViz",
      artifactId: "art-custom-1",
      displayName: "演示排名条",
    });
  });

  it("does not fetch custom artifacts when onInsertCustomViz is omitted", async () => {
    const { fetchAiVizArtifacts } = await import("@/lib/aiVizArtifacts");
    vi.mocked(fetchAiVizArtifacts).mockClear();
    renderPicker();
    const popover = await screen.findByTestId("chart-picker-popover");

    expect(await within(popover).findByRole("button", { name: /基础折线图/i })).toBeInTheDocument();
    expect(fetchAiVizArtifacts).not.toHaveBeenCalled();
    expect(within(popover).queryByRole("button", { name: "自定义" })).not.toBeInTheDocument();
  });
});