import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ChartPickerPopover } from "./ChartPickerPopover";
import { DASHBOARD_CHART_DND_TYPE } from "@/lib/dashboardDnd";

vi.mock("@/lib/chartRegistry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chartRegistry")>();
  return {
    ...actual,
    fetchChartTypeCatalog: vi.fn(async () => [
      { type: "line", displayName: "基础折线图", library: "d3", paletteCategory: "trend" },
    ]),
  };
});

vi.stubGlobal(
  "IntersectionObserver",
  vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })),
);

describe("ChartPickerPopover drag", () => {
  it("keeps drag payload and notifies drag session callbacks", async () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <MemoryRouter>
        <ChartPickerPopover
          onInsert={vi.fn()}
          onPaletteDragStart={onDragStart}
          onPaletteDragEnd={onDragEnd}
        />
      </MemoryRouter>,
    );

    const tile = await screen.findByRole("button", { name: /基础折线图/i });
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
