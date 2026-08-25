import { describe, expect, it } from "vitest";
import {
  capChartPaintSize,
  resolveEditPaintMaxEdge,
  shouldDeferEditLivePaint,
} from "@/lib/dashboardEditChartPerf";

describe("dashboardEditChartPerf", () => {
  it("caps paint size by max edge", () => {
    expect(capChartPaintSize({ width: 800, height: 600 }, 720)).toEqual({
      width: 720,
      height: 540,
    });
  });

  it("skips cap when selected in edit mode", () => {
    expect(resolveEditPaintMaxEdge(true, true)).toBeUndefined();
    expect(resolveEditPaintMaxEdge(true, false)).toBe(720);
    expect(resolveEditPaintMaxEdge(false, false)).toBeUndefined();
  });

  it("defers live paint for unselected edit widgets", () => {
    expect(shouldDeferEditLivePaint(true, false)).toBe(true);
    expect(shouldDeferEditLivePaint(true, true)).toBe(false);
  });
});
