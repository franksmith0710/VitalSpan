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

  it("prefers the closest snap candidate within threshold", () => {
    const active: PixelRect = { x: 98, y: 100, width: 200, height: 120 };
    const near: PixelRect = { x: 400, y: 100, width: 200, height: 80 };
    const far: PixelRect = { x: 700, y: 104, width: 200, height: 80 };

    const result = computeMarkLineSnap(active, [far, near], {
      threshold: 8,
      dragDir: dragLeftUp,
    });

    expect(result.rect.y).toBe(100);
    expect(result.guides).toEqual([{ id: "xt", position: 100 }]);
  });

  it("snaps with gap adjacency on outer junction and shows gap midline", () => {
    const active: PixelRect = { x: 303, y: 50, width: 200, height: 120 };
    const other: PixelRect = { x: 0, y: 80, width: 300, height: 120 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: dragRightDown,
      gap: 5,
    });

    expect(result.rect.x).toBe(300);
    expect(result.guides).toContainEqual({ id: "yl", position: 300 });
  });

  it("snaps adjacent visuals flush when gap is zero with chrome inset", () => {
    const active: PixelRect = { x: 292, y: 50, width: 200, height: 120 };
    const other: PixelRect = { x: 0, y: 80, width: 300, height: 120 };
    const inset = { top: 0, right: 0, bottom: 0, left: 8 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: dragRightDown,
      gap: 0,
      chromeInset: inset,
    });

    expect(result.rect.x).toBe(292);
    expect(result.guides).toContainEqual({ id: "yr", position: 300 });
  });

  it("aligns visual edges and draws guide on inset line when gap > 0", () => {
    const active: PixelRect = { x: 100, y: 102, width: 200, height: 120 };
    const other: PixelRect = { x: 400, y: 100, width: 200, height: 80 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: dragLeftUp,
      gap: 8,
    });

    expect(result.rect.y).toBe(100);
    expect(result.guides).toEqual([{ id: "xt", position: 108 }]);
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

  it("snaps bottom edge while resizing south", () => {
    const active: PixelRect = { x: 100, y: 100, width: 200, height: 198 };
    const other: PixelRect = { x: 400, y: 100, width: 200, height: 200 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: { isRightward: false, isDownward: true },
      interactionKind: "s",
      anchorRect: { x: 100, y: 100, width: 200, height: 120 },
    });

    expect(result.rect.height).toBe(200);
    expect(result.guides).toContainEqual({ id: "xb", position: 300 });
  });

  it("snaps right edge while resizing east", () => {
    const active: PixelRect = { x: 100, y: 100, width: 298, height: 120 };
    const other: PixelRect = { x: 400, y: 100, width: 200, height: 120 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: { isRightward: true, isDownward: false },
      interactionKind: "e",
      anchorRect: { x: 100, y: 100, width: 200, height: 120 },
    });

    expect(result.rect.width).toBe(300);
    expect(result.guides).toContainEqual({ id: "yl", position: 400 });
  });

  it("ignores left-edge snap while resizing east only", () => {
    const active: PixelRect = { x: 98, y: 100, width: 200, height: 120 };
    const other: PixelRect = { x: 500, y: 100, width: 200, height: 120 };

    const result = computeMarkLineSnap(active, [other], {
      threshold: 3,
      dragDir: { isRightward: true, isDownward: false },
      interactionKind: "e",
      anchorRect: { x: 100, y: 100, width: 200, height: 120 },
    });

    expect(result.rect.x).toBe(98);
    expect(result.guides).toEqual([]);
  });

  it("uses DE canvas threshold with screen floor at small scale", () => {
    expect(markLineThreshold(1)).toBe(8);
    expect(markLineThreshold(0.5)).toBe(16);
    expect(markLineThreshold(4)).toBe(3);
  });
});
