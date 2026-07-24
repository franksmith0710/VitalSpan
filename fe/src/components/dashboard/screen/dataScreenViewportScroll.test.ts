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

  it("treats left and top rulers as hard boundaries", () => {
    const { padX, padY } = resolveDataScreenEditPanPadding(viewport, content);
    const bounds = computeViewportPanBounds(viewport, content);
    expect(bounds.minPanX).toBe(0);
    expect(bounds.minPanY).toBe(0);
    expect(bounds.maxPanX).toBe(padX);
    expect(bounds.maxPanY).toBe(padY);
    expect(clampViewportPan({ x: -100, y: -50 }, bounds)).toEqual({ x: 0, y: 0 });
  });

  it("allows pan up to letterbox offset when content is centered", () => {
    const letterboxed = { ...content, offsetX: 40, offsetY: 30 };
    const bounds = computeViewportPanBounds(viewport, letterboxed);
    expect(bounds.minPanX).toBe(-40);
    expect(bounds.minPanY).toBe(-30);
    expect(clampViewportPan({ x: -80, y: -60 }, bounds)).toEqual({ x: -40, y: -30 });
  });

  it("anchors home at pan=0 and extends workspace padding on right/bottom", () => {
    const smaller = {
      scaledWidth: 900,
      scaledHeight: 400,
      offsetX: 0,
      offsetY: 0,
    };
    const { padX, padY } = resolveDataScreenEditPanPadding(viewport, smaller);
    const bounds = computeViewportPanBounds(viewport, smaller);
    expect(bounds.minPanX).toBe(0);
    expect(bounds.minPanY).toBe(0);
    expect(bounds.maxPanX).toBe(padX);
    expect(bounds.maxPanY).toBe(padY);
    expect(clampViewportPan({ x: -80, y: -200 }, bounds)).toEqual({ x: 0, y: 0 });
    expect(clampViewportPan({ x: 200, y: 150 }, bounds)).toEqual({ x: 200, y: 150 });
    expect(clampViewportPan({ x: 9999, y: 9999 }, bounds)).toEqual({ x: padX, y: padY });
  });

  it("maps pan to scrollbar offset and back", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    const metrics = computeViewportScrollMetrics(viewport, content, { x: 100, y: 50 });
    expect(metrics.horizontal.canScroll).toBe(true);
    expect(metrics.vertical.canScroll).toBe(true);
    expect(metrics.horizontal.scrollOffset).toBe(bounds.maxPanX - 100);
    expect(metrics.vertical.scrollOffset).toBe(bounds.maxPanY - 50);
    expect(panFromHorizontalScroll(metrics.horizontal.scrollOffset, bounds)).toBe(100);
    expect(panFromVerticalScroll(metrics.vertical.scrollOffset, bounds)).toBe(50);
  });

  it("moves scrollbar thumb when panning into right/bottom workspace", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    const home = computeViewportScrollMetrics(viewport, content, { x: 0, y: 0 });
    const deeper = computeViewportScrollMetrics(viewport, content, { x: 100, y: 80 });
    expect(deeper.horizontal.scrollOffset).toBeLessThan(home.horizontal.scrollOffset);
    expect(deeper.vertical.scrollOffset).toBeLessThan(home.vertical.scrollOffset);
    expect(panFromHorizontalScroll(home.horizontal.scrollOffset, bounds)).toBe(0);
    expect(panFromVerticalScroll(home.vertical.scrollOffset, bounds)).toBe(0);
  });

  it("clamps pan inside bounds", () => {
    const bounds = computeViewportPanBounds(viewport, content);
    expect(clampViewportPan({ x: 9999, y: 9999 }, bounds).x).toBe(bounds.maxPanX);
    expect(clampViewportPan({ x: -9999, y: -9999 }, bounds).x).toBe(bounds.minPanX);
    expect(clampViewportPan({ x: -9999, y: -9999 }, bounds).y).toBe(bounds.minPanY);
  });
});
