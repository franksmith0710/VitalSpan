import { describe, expect, it } from "vitest";
import {
  clampViewportPan,
  computeViewportPanBounds,
  computeViewportScrollMetrics,
  panFromHorizontalScroll,
  panFromVerticalScroll,
} from "./dataScreenViewportScroll";

describe("dataScreenViewportScroll", () => {
  const viewport = { width: 1000, height: 600 };
  const content = {
    scaledWidth: 1200,
    scaledHeight: 800,
    offsetX: 0,
    offsetY: 0,
  };

  it("computes pan bounds when content exceeds viewport", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    expect(bounds.minPanX).toBe(-200);
    expect(bounds.maxPanX).toBe(0);
    expect(bounds.minPanY).toBe(-200);
    expect(bounds.maxPanY).toBe(0);
  });

  it("maps pan to scrollbar offset and back", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    const metrics = computeViewportScrollMetrics(viewport, content, { x: -100, y: -50 });
    expect(metrics.horizontal.canScroll).toBe(true);
    expect(metrics.vertical.canScroll).toBe(true);
    expect(metrics.horizontal.scrollOffset).toBe(100);
    expect(metrics.vertical.scrollOffset).toBe(50);
    expect(panFromHorizontalScroll(100, bounds)).toBe(-100);
    expect(panFromVerticalScroll(50, bounds)).toBe(-50);
  });

  it("clamps pan inside bounds", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    expect(clampViewportPan({ x: 40, y: -999 }, bounds).x).toBe(0);
    expect(clampViewportPan({ x: 40, y: -999 }, bounds).y).toBe(-200);
  });
});
