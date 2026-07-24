import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LayerPanel } from "./LayerPanel";
import type { LayoutWidget } from "./layoutUtils";

const widgets: LayoutWidget[] = [
  {
    id: "w1",
    type: "chart",
    title: "透视表",
    colSpan: 6,
    rowSpan: 4,
    order: 0,
    chartConfig: { chartType: "table-pivot", dimensions: [], metrics: [] },
  },
  {
    id: "w2",
    type: "chart",
    title: "基础条形图",
    colSpan: 6,
    rowSpan: 4,
    order: 1,
    chartConfig: { chartType: "bar", dimensions: [], metrics: [] },
  },
  {
    id: "w3",
    type: "chart",
    title: "热力图",
    colSpan: 6,
    rowSpan: 4,
    order: 2,
    chartConfig: { chartType: "t-heatmap", dimensions: [], metrics: [] },
  },
];

afterEach(() => {
  cleanup();
});

describe("LayerPanel", () => {
  it("lists top-level widgets in reverse z-order", () => {
    const { container } = render(
      <LayerPanel widgets={widgets} selectedId={null} onSelect={vi.fn()} onWidgetsChange={vi.fn()} />,
    );
    const list = container.querySelector("[data-layer-panel] ul");
    expect(list).toBeTruthy();
    const titles = within(list as HTMLElement)
      .getAllByText(/透视表|基础条形图|热力图/)
      .map((el) => el.textContent);
    expect(titles).toEqual(["热力图", "基础条形图", "透视表"]);
  });

  it("toggles hidden inline without selecting first", () => {
    const onWidgetsChange = vi.fn();
    render(
      <LayerPanel widgets={widgets} selectedId={null} onSelect={vi.fn()} onWidgetsChange={onWidgetsChange} />,
    );
    const rows = document.querySelectorAll("[data-layer-panel] li > div[role='button']");
    const barRow = rows[1] as HTMLElement;
    fireEvent.click(within(barRow).getByRole("button", { name: "隐藏图层" }));
    expect(onWidgetsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "w2", hidden: true })]),
    );
  });

  it("toggles lock inline on any row", () => {
    const onWidgetsChange = vi.fn();
    render(
      <LayerPanel widgets={widgets} selectedId={null} onSelect={vi.fn()} onWidgetsChange={onWidgetsChange} />,
    );
    const rows = document.querySelectorAll("[data-layer-panel] li > div[role='button']");
    fireEvent.click(within(rows[0] as HTMLElement).getByRole("button", { name: "锁定图层" }));
    expect(onWidgetsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "w3", locked: true })]),
    );
  });

  it("selects layer on row click", () => {
    const onSelect = vi.fn();
    render(
      <LayerPanel widgets={widgets} selectedId={null} onSelect={onSelect} onWidgetsChange={vi.fn()} />,
    );
    const rows = document.querySelectorAll("[data-layer-panel] li [role='button']");
    fireEvent.click(rows[rows.length - 1] as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith("w1");
  });
});
