import { describe, expect, it } from "vitest";
import { placeNewWidget, widgetsToGridLayout } from "@/components/dashboard/gridLayoutAdapter";
import { defaultChartConfig, type LayoutWidget } from "@/components/dashboard/layoutUtils";
import {
  compactLayoutVertical,
  findFirstFreeSlot,
  normalizeGridLayout,
  snapLayoutToGrid,
} from "./gridSnapUtils";

describe("gridSnapUtils", () => {
  it("T-DASH-GRID-01: compactLayoutVertical removes vertical gaps", () => {
    const layout = [
      { i: "a", x: 0, y: 0, w: 6, h: 3 },
      { i: "b", x: 0, y: 5, w: 6, h: 3 },
    ];
    const compacted = compactLayoutVertical(layout);
    expect(compacted[1].y).toBe(3);
  });

  it("T-DASH-GRID-02: findFirstFreeSlot places second widget beside first 6-col item", () => {
    const layout = [{ i: "a", x: 0, y: 0, w: 6, h: 3 }];
    const slot = findFirstFreeSlot(layout, 6, 3);
    expect(slot).toEqual({ x: 6, y: 0 });
  });

  it("T-DASH-GRID-03: snapLayoutToGrid snaps x for half-width widgets", () => {
    const snapped = snapLayoutToGrid([{ i: "a", x: 4, y: 0, w: 6, h: 3 }]);
    expect(snapped[0].x).toBe(6);
    expect(snapped[0].w).toBe(6);
  });
});

describe("placeNewWidget flow", () => {
  const base: LayoutWidget = {
    id: "w1",
    type: "chart",
    title: "A",
    colSpan: 6,
    rowSpan: 3,
    order: 0,
    gridX: 0,
    gridY: 0,
    chartConfig: defaultChartConfig("line"),
  };

  it("T-DASH-GRID-04: second widget flows to same row when space allows", () => {
    const second: LayoutWidget = {
      ...base,
      id: "w2",
      title: "B",
      order: 1,
      gridX: undefined,
      gridY: undefined,
      chartConfig: defaultChartConfig("bar"),
    };
    const placed = placeNewWidget([base], second);
    expect(placed.gridX).toBe(6);
    expect(placed.gridY).toBe(0);
  });

  it("T-DASH-GRID-05: normalizeGridLayout compacts after snap", () => {
    const layout = widgetsToGridLayout([
      base,
      { ...base, id: "w2", order: 1, gridX: 0, gridY: 8 },
    ]);
    const normalized = normalizeGridLayout(layout);
    expect(normalized[1].y).toBeLessThan(8);
  });
});
