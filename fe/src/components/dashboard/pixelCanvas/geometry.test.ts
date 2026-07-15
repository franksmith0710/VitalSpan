import { describe, expect, it } from "vitest";
import {
  applyPixelInteraction,
  RESIZE_CURSORS,
  resolvePixelCanvasMeasureElement,
  pixelShapeZIndex,
  PIXEL_MARK_LINE_Z_INDEX,
  PIXEL_SHAPE_SELECTED_Z_BOOST,
  resolveShapeActionRailPlacement,
  resolveShapeActionRailSide,
  resolveScaleDesignHeight,
  snapScaledContentWidth,
  scaledCanvasMetrics,
  screenDeltaToCanvas,
  type PixelRect,
} from "./geometry";

const rect: PixelRect = { x: 100, y: 80, width: 300, height: 200 };

describe("pixel canvas geometry", () => {
  it("converts screen movement into canonical canvas coordinates", () => {
    expect(screenDeltaToCanvas({ x: 90, y: 45 }, 0.5)).toEqual({ x: 180, y: 90 });
  });

  it.each([
    ["n", { x: 0, y: -40 }, { x: 100, y: 40, width: 300, height: 240 }],
    ["ne", { x: 40, y: -40 }, { x: 100, y: 40, width: 340, height: 240 }],
    ["e", { x: 40, y: 0 }, { x: 100, y: 80, width: 340, height: 200 }],
    ["se", { x: 40, y: 40 }, { x: 100, y: 80, width: 340, height: 240 }],
    ["s", { x: 0, y: 40 }, { x: 100, y: 80, width: 300, height: 240 }],
    ["sw", { x: -40, y: 40 }, { x: 60, y: 80, width: 340, height: 240 }],
    ["w", { x: -40, y: 0 }, { x: 60, y: 80, width: 340, height: 200 }],
    ["nw", { x: -40, y: -40 }, { x: 60, y: 40, width: 340, height: 240 }],
  ] as const)("resizes toward %s while keeping the opposite edges fixed", (direction, delta, expected) => {
    expect(
      applyPixelInteraction(rect, delta, direction, {
        width: 1440,
        height: 900,
      }),
    ).toEqual(expected);
  });

  it("computes scaled content metrics for a narrow host", () => {
    expect(scaledCanvasMetrics(645, 420, 1440, 900, 900, 0)).toEqual({
      scale: 645 / 1440,
      contentWidth: 645,
      contentHeight: 420,
      stageLeft: 0,
      centerContent: false,
    });
  });

  it("extends dot-grid background to host height without upscaling widgets", () => {
    const metrics = scaledCanvasMetrics(740, 699, 1440, 320, 320, 0);
    expect(metrics.scale).toBeCloseTo(740 / 1440, 5);
    expect(metrics.contentHeight).toBe(699);
    expect(metrics.contentWidth).toBe(740);
    expect(metrics.centerContent).toBe(false);
  });

  it("uses width-fit scale and ceil height when content exceeds the viewport", () => {
    const metrics = scaledCanvasMetrics(800, 600, 1440, 2000, 2000, 0);
    expect(metrics.scale).toBeCloseTo(800 / 1440, 5);
    expect(metrics.contentWidth).toBe(800);
    expect(metrics.contentHeight).toBe(Math.ceil((2000 * 800) / 1440));
    expect(metrics.centerContent).toBe(false);
  });

  it("letterboxes component scale without leaving a wide empty content strip", () => {
    const metrics = scaledCanvasMetrics(1189, 400, 1440, 900, 900, 0, "component");
    expect(metrics.scale).toBeCloseTo(400 / 900, 5);
    expect(metrics.contentWidth).toBe(Math.ceil((1440 * 400) / 900));
    expect(metrics.contentHeight).toBe(Math.ceil(400));
    expect(metrics.centerContent).toBe(true);
    expect(metrics.stageLeft).toBe(0);
  });

  it("snaps component width when within sub-pixel gap of the host", () => {
    const available = 766;
    const scale = available / 1440;
    const metrics = scaledCanvasMetrics(available, 700, 1440, 900, 900, 0, "component");
    expect(metrics.scale).toBeCloseTo(scale, 5);
    expect(metrics.contentWidth).toBe(available);
    expect(metrics.centerContent).toBe(false);
  });

  it("uses design canvas height for component scale even when content is taller", () => {
    expect(resolveScaleDesignHeight(2000)).toBe(900);
    const metrics = scaledCanvasMetrics(1189, 836, 1440, 900, 2000, 0, "component");
    const scale = Math.min(1189 / 1440, 836 / 900);
    expect(metrics.scale).toBeCloseTo(scale, 5);
    expect(metrics.contentWidth).toBe(Math.min(Math.ceil(1440 * scale), 1189));
    expect(metrics.contentHeight).toBe(Math.ceil(2000 * scale));
    expect(metrics.centerContent).toBe(metrics.contentWidth < 1188.5);
  });

  it("allows vertical growth when bottom growth is enabled", () => {
    expect(
      applyPixelInteraction(
        { x: 61, y: 6, width: 1379, height: 894 },
        { x: 100, y: 100 },
        "move",
        { width: 1440, height: 900 },
        { allowBottomGrowth: true },
      ),
    ).toEqual({ x: 61, y: 106, width: 1379, height: 894 });
  });

  it("clamps movement to canvas bounds by default", () => {
    expect(
      applyPixelInteraction(rect, { x: 1400, y: 900 }, "move", {
        width: 1440,
        height: 900,
      }),
    ).toEqual({ ...rect, x: 1140, y: 700 });
  });

  it("uses the standard cursor for every resize direction", () => {
    expect(RESIZE_CURSORS).toEqual({
      n: "ns-resize",
      ne: "nesw-resize",
      e: "ew-resize",
      se: "nwse-resize",
      s: "ns-resize",
      sw: "nesw-resize",
      w: "ew-resize",
      nw: "nwse-resize",
    });
  });

  it.each([
    ["w", { x: -500, y: 0 }, { x: 0, y: 80, width: 400, height: 200 }],
    ["e", { x: 2000, y: 0 }, { x: 100, y: 80, width: 1340, height: 200 }],
    ["n", { x: 0, y: -500 }, { x: 100, y: 0, width: 300, height: 280 }],
    ["s", { x: 0, y: 2000 }, { x: 100, y: 80, width: 300, height: 820 }],
  ] as const)("clamps the %s edge to the canvas", (direction, delta, expected) => {
    expect(applyPixelInteraction(rect, delta, direction, { width: 1440, height: 900 })).toEqual(
      expected,
    );
  });

  it("enforces minimum width and height while preserving opposite edges", () => {
    expect(
      applyPixelInteraction(rect, { x: 500, y: 500 }, "nw", {
        width: 1440,
        height: 900,
      }),
    ).toEqual({ x: 280, y: 200, width: 120, height: 80 });
  });

  it("prefers pixel-canvas-host as the measure element when present", () => {
    const surface = document.createElement("div");
    surface.className = "dashboard-canvas-surface";
    Object.defineProperty(surface, "clientWidth", { value: 766 });
    Object.defineProperty(surface, "clientHeight", { value: 540 });

    const host = document.createElement("div");
    host.className = "pixel-canvas-host";
    Object.defineProperty(host, "clientWidth", { value: 751 });
    Object.defineProperty(host, "clientHeight", { value: 540 });
    surface.appendChild(host);

    expect(resolvePixelCanvasMeasureElement(host)).toBe(host);
  });

  it("prefers dashboard-canvas-surface as the stable measure element", () => {
    const surface = document.createElement("div");
    surface.className = "dashboard-canvas-surface";
    Object.defineProperty(surface, "clientWidth", { value: 960 });
    Object.defineProperty(surface, "clientHeight", { value: 540 });

    const growing = document.createElement("div");
    Object.defineProperty(growing, "clientWidth", { value: 23098 });
    Object.defineProperty(growing, "clientHeight", { value: 19561 });
    surface.appendChild(growing);

    const host = document.createElement("div");
    growing.appendChild(host);

    expect(resolvePixelCanvasMeasureElement(host)).toBe(surface);
  });

  it("places action rail on the right when space allows", () => {
    const widget = { x: 100, y: 0, width: 300, height: 200 };
    expect(resolveShapeActionRailPlacement(widget, { x: 0, width: 1440 }, 1)).toBe("right");
    expect(resolveShapeActionRailSide(widget, { x: 0, width: 1440 }, 1)).toBe("right");
  });

  it("flips action rail to the left near the right viewport edge", () => {
    const widget = { x: 1200, y: 0, width: 300, height: 200 };
    expect(resolveShapeActionRailPlacement(widget, { x: 0, width: 1440 }, 1)).toBe("left");
    expect(resolveShapeActionRailSide(widget, { x: 0, width: 1440 }, 1)).toBe("left");
  });

  it("prefers external side over overlay when both sides collide with neighbors", () => {
    const widget = { x: 400, y: 0, width: 300, height: 200 };
    const leftNeighbor = { x: 100, y: 0, width: 320, height: 200 };
    const rightNeighbor = { x: 680, y: 0, width: 300, height: 200 };
    expect(
      resolveShapeActionRailPlacement(
        widget,
        { x: 0, width: 1440 },
        1,
        [leftNeighbor, rightNeighbor],
      ),
    ).toBe("right");
  });

  it("elevates selected widget z-index above normal order", () => {
    expect(pixelShapeZIndex(3, false)).toBe(3);
    expect(pixelShapeZIndex(3, true)).toBeGreaterThan(pixelShapeZIndex(99, false));
  });

  it("keeps mark-line overlay above selected shapes", () => {
    expect(PIXEL_MARK_LINE_Z_INDEX).toBeGreaterThan(
      pixelShapeZIndex(999_999, true),
    );
    expect(PIXEL_MARK_LINE_Z_INDEX).toBeGreaterThan(PIXEL_SHAPE_SELECTED_Z_BOOST);
  });
});
