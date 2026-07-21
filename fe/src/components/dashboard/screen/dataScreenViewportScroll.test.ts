import { describe, expect, it } from "vitest";
import {
  clampViewportPan,
  computeViewportPanBounds,
  computeViewportScrollMetrics,
  panFromHorizontalScroll,
  panFromVerticalScroll,
  resolveDataScreenEditPanPadding,
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
    const { padX, padY } = resolveDataScreenEditPanPadding(viewport, content);
    const bounds = computeViewportPanBounds(viewport, content);
    expect(bounds.minPanX).toBe(-200 - padX);
    expect(bounds.maxPanX).toBe(0);
    expect(bounds.minPanY).toBe(-200 - padY);
    expect(bounds.maxPanY).toBe(0);
  });

  it("locks left/top (maxPan=0) while extending minPan for right/bottom workspace", () => {
    const smaller = {
      scaledWidth: 900,
      scaledHeight: 400,
      offsetX: 0,
      offsetY: 0,
    };
    const { padX, padY } = resolveDataScreenEditPanPadding(viewport, smaller);
    const bounds = computeViewportPanBounds(viewport, smaller);
    expect(bounds.maxPanX).toBe(0);
    expect(bounds.maxPanY).toBe(0);
    expect(bounds.minPanX).toBe(-padX);
    expect(bounds.minPanY).toBe(-padY);
    expect(clampViewportPan({ x: -80, y: -200 }, bounds)).toEqual({ x: -80, y: -200 });
    expect(clampViewportPan({ x: 200, y: 150 }, bounds)).toEqual({ x: 0, y: 0 });
  });

  it("maps pan to scrollbar offset and back", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    const metrics = computeViewportScrollMetrics(viewport, content, { x: -100, y: -50 });
    expect(metrics.horizontal.canScroll).toBe(true);
    expect(metrics.vertical.canScroll).toBe(true);
    expect(metrics.horizontal.scrollOffset).toBe(bounds.maxPanX - -100);
    expect(metrics.vertical.scrollOffset).toBe(bounds.maxPanY - -50);
    expect(panFromHorizontalScroll(metrics.horizontal.scrollOffset, bounds)).toBe(-100);
    expect(panFromVerticalScroll(metrics.vertical.scrollOffset, bounds)).toBe(-50);
  });

  it("clamps pan inside bounds", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    expect(clampViewportPan({ x: 9999, y: 9999 }, bounds).x).toBe(bounds.maxPanX);
    expect(clampViewportPan({ x: -9999, y: -9999 }, bounds).x).toBe(bounds.minPanX);
    expect(clampViewportPan({ x: -9999, y: -9999 }, bounds).y).toBe(bounds.minPanY);
  });
});
