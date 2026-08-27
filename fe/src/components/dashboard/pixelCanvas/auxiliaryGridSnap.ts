import type { PixelInteractionKind, PixelRect } from "./geometry";
import type { ResolvedDashboardAlignmentSnap } from "../dashboardChromeConfig";

export { AUXILIARY_GRID_CELL_PX } from "../dashboardChromeConfig";

const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

export function shouldApplyAuxiliaryGridSnap(
  alignment: Pick<ResolvedDashboardAlignmentSnap, "enableGridSnap">,
  showAuxiliaryGrid: boolean,
): boolean {
  return showAuxiliaryGrid && alignment.enableGridSnap;
}

function snapCoord(value: number, cell: number): number {
  return Math.round(value / cell) * cell;
}

/** 将外框吸附到网格步长（在组件对齐吸附之后应用） */
export function snapRectToAuxiliaryGrid(
  rect: PixelRect,
  kind: PixelInteractionKind,
  cell: number,
): PixelRect {
  const safeCell = Math.max(8, Math.round(cell));
  if (kind === "move") {
    return {
      ...rect,
      x: snapCoord(rect.x, safeCell),
      y: snapCoord(rect.y, safeCell),
    };
  }

  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const snappedX = snapCoord(rect.x, safeCell);
  const snappedY = snapCoord(rect.y, safeCell);
  const snappedRight = Math.max(snappedX + safeCell, snapCoord(right, safeCell));
  const snappedBottom = Math.max(snappedY + safeCell, snapCoord(bottom, safeCell));

  return {
    x: snappedX,
    y: snappedY,
    width: Math.max(MIN_WIDTH, snappedRight - snappedX),
    height: Math.max(MIN_HEIGHT, snappedBottom - snappedY),
  };
}
