import { describe, expect, it } from "vitest";
import {
  chooseVisibleMarkLines,
  computeMarkLineSnap,
  markLineThreshold,
  type DragDirection,
} from "./pixelMarkLine";
import type { PixelRect } from "./geometry";

const dragRightDown: DragDirection = { isRightward: true, isDownward: true };
const dragLeftUp: DragDirection = { isRightward: false, isDownward: false };

describe("pixelMarkLine", () => {
  it("snaps top edges within threshold and shows xt", () => {
    const active: PixelRect = { x: 100, y: 102, width: 200, height: 120 };
    const other: PixelRect = { x: 400, y: 100, width: 200, height: 80 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: dragLeftUp,
    });

    expect(result.rect.y).toBe(100);
    expect(result.guides).toEqual([{ id: "xt", position: 100 }]);
  });

  it("snaps vertical centers and shows yc", () => {
    const active: PixelRect = { x: 452, y: 50, width: 200, height: 80 };
    const other: PixelRect = { x: 400, y: 200, width: 300, height: 120 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: dragLeftUp,
    });

    expect(result.rect.x).toBe(450);
    expect(result.guides).toEqual([{ id: "yc", position: 550 }]);
  });

  it("returns no guides when outside threshold", () => {
    const active: PixelRect = { x: 100, y: 200, width: 200, height: 120 };
    const other: PixelRect = { x: 400, y: 100, width: 200, height: 120 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: dragRightDown,
    });

    expect(result.rect).toEqual(active);
    expect(result.guides).toEqual([]);
  });

  it("prefers one horizontal and one vertical guide by drag direction", () => {
    const guides = chooseVisibleMarkLines(
      [
        { id: "xt", position: 100 },
        { id: "xb", position: 220 },
        { id: "yl", position: 50 },
        { id: "yr", position: 350 },
      ],
      dragRightDown,
    );

    expect(guides).toEqual([
      { id: "xb", position: 220 },
      { id: "yr", position: 350 },
    ]);
  });

  it("prefers xt and yl when dragging left and up", () => {
    const guides = chooseVisibleMarkLines(
      [
        { id: "xt", position: 100 },
        { id: "xb", position: 220 },
        { id: "yl", position: 50 },
        { id: "yr", position: 350 },
      ],
      dragLeftUp,
    );

    expect(guides).toEqual([
      { id: "xt", position: 100 },
      { id: "yl", position: 50 },
    ]);
  });

  it("snaps to canvas right edge when canvas bounds provided", () => {
    const active: PixelRect = { x: 1242, y: 100, width: 200, height: 120 };

    const result = computeMarkLineSnap(active, [], {
      threshold: 3,
      dragDir: dragRightDown,
      canvas: { width: 1440, height: 900 },
    });

    expect(result.rect.x).toBe(1240);
    expect(result.guides).toEqual([{ id: "yr", position: 1440 }]);
  });

  it("converts screen threshold to canvas units by scale", () => {
    expect(markLineThreshold(0.5)).toBe(6);
    expect(markLineThreshold(2)).toBe(1.5);
  });
});
