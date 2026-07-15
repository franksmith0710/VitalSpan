import { describe, expect, it } from "vitest";
import { AUXILIARY_GRID_CELL_PX, snapRectToAuxiliaryGrid } from "./auxiliaryGridSnap";

describe("snapRectToAuxiliaryGrid", () => {
  it("snaps move position to grid cells", () => {
    const rect = { x: 13, y: 27, width: 200, height: 160 };
    expect(snapRectToAuxiliaryGrid(rect, "move")).toEqual({
      x: 20,
      y: 20,
      width: 200,
      height: 160,
    });
  });

  it("snaps resize edges to grid cells", () => {
    const rect = { x: 13, y: 27, width: 203, height: 157 };
    const snapped = snapRectToAuxiliaryGrid(rect, "se");
    expect(snapped.x % AUXILIARY_GRID_CELL_PX).toBe(0);
    expect(snapped.y % AUXILIARY_GRID_CELL_PX).toBe(0);
    expect((snapped.x + snapped.width) % AUXILIARY_GRID_CELL_PX).toBe(0);
    expect((snapped.y + snapped.height) % AUXILIARY_GRID_CELL_PX).toBe(0);
  });
});
