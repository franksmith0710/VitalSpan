import { describe, expect, it } from "vitest";
import {
  shouldApplyAuxiliaryGridSnap,
  snapRectToAuxiliaryGrid,
} from "./auxiliaryGridSnap";

const gridSnapOn = { enableGridSnap: true } as const;
const gridSnapOff = { enableGridSnap: false } as const;

describe("shouldApplyAuxiliaryGridSnap", () => {
  it("requires auxiliary grid and enableGridSnap", () => {
    expect(shouldApplyAuxiliaryGridSnap(gridSnapOn, true)).toBe(true);
    expect(shouldApplyAuxiliaryGridSnap(gridSnapOn, false)).toBe(false);
    expect(shouldApplyAuxiliaryGridSnap(gridSnapOff, true)).toBe(false);
    expect(shouldApplyAuxiliaryGridSnap(gridSnapOff, false)).toBe(false);
  });
});

describe("snapRectToAuxiliaryGrid", () => {
  const cell = 20;

  it("snaps move position to grid cells", () => {
    const rect = { x: 13, y: 27, width: 200, height: 160 };
    expect(snapRectToAuxiliaryGrid(rect, "move", cell)).toEqual({
      x: 20,
      y: 20,
      width: 200,
      height: 160,
    });
  });

  it("snaps resize edges to grid cells", () => {
    const rect = { x: 13, y: 27, width: 203, height: 157 };
    const snapped = snapRectToAuxiliaryGrid(rect, "se", cell);
    expect(snapped.x % cell).toBe(0);
    expect(snapped.y % cell).toBe(0);
    expect((snapped.x + snapped.width) % cell).toBe(0);
    expect((snapped.y + snapped.height) % cell).toBe(0);
  });
});
