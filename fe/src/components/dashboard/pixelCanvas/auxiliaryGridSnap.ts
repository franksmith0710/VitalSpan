import type { PixelInteractionKind, PixelRect } from "./geometry";
import { AUXILIARY_GRID_CELL_PX } from "../dashboardChromeConfig";

export { AUXILIARY_GRID_CELL_PX };

const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

/** DE `de-grid` 仅视觉参考，不做步长吸附 */
export function shouldApplyAuxiliaryGridSnap(
  _markLinesEnabled: boolean,
  _shapeGapPx: number,
): boolean {
  return false;
}

function snapCoord(value: number, cell = AUXILIARY_GRID_CELL_PX): number {
  return Math.round(value / cell) * cell;
}

/** @deprecated 保留测试；生产路径不调用 */
export function snapRectToAuxiliaryGrid(
  rect: PixelRect,
  kind: PixelInteractionKind,
  cell = AUXILIARY_GRID_CELL_PX,
): PixelRect {
  if (kind === "move") {
    return {
      ...rect,
      x: snapCoord(rect.x, cell),
      y: snapCoord(rect.y, cell),
    };
  }

  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const snappedX = snapCoord(rect.x, cell);
  const snappedY = snapCoord(rect.y, cell);
  const snappedRight = Math.max(snappedX + cell, snapCoord(right, cell));
  const snappedBottom = Math.max(snappedY + cell, snapCoord(bottom, cell));

  return {
    x: snappedX,
    y: snappedY,
    width: Math.max(MIN_WIDTH, snappedRight - snappedX),
    height: Math.max(MIN_HEIGHT, snappedBottom - snappedY),
  };
}
