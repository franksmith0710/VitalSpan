import { describe, expect, it } from "vitest";
import {
  applyPixelInteraction,
  RESIZE_CURSORS,
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
    expect(scaledCanvasMetrics(645, 420, 1440, 900, 0)).toEqual({
      scale: 645 / 1440,
      contentWidth: 645,
      contentHeight: 420,
    });
  });

  it("extends dot-grid background to host height without upscaling widgets", () => {
    const metrics = scaledCanvasMetrics(740, 699, 1440, 320, 0);
    expect(metrics.scale).toBeCloseTo(740 / 1440, 5);
    expect(metrics.contentHeight).toBe(699);
    expect(metrics.contentWidth).toBe(740);
  });

  it("uses width-fit scale and ceil height when content exceeds the viewport", () => {
    const metrics = scaledCanvasMetrics(800, 600, 1440, 2000, 0);
    expect(metrics.scale).toBeCloseTo(800 / 1440, 5);
    expect(metrics.contentWidth).toBe(800);
    expect(metrics.contentHeight).toBe(Math.ceil((2000 * 800) / 1440));
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
});
