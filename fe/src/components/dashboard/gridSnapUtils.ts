import type { Layout, LayoutItem } from "react-grid-layout/legacy";

export const GRID_COLS = 12;
const PREFERRED_WIDTHS = [4, 6, 8, 12];

function snapWidth(w: number): number {
  const rounded = Math.min(GRID_COLS, Math.max(1, Math.round(w)));
  let best = rounded;
  let bestDist = Infinity;
  for (const pref of PREFERRED_WIDTHS) {
    const dist = Math.abs(rounded - pref);
    if (dist < bestDist) {
      bestDist = dist;
      best = pref;
    }
  }
  return bestDist <= 1 ? best : rounded;
}

function snapX(x: number, w: number): number {
  const snappedW = snapWidth(w);
  const maxX = GRID_COLS - snappedW;
  return Math.min(maxX, Math.max(0, Math.round(x)));
}

function snapItem(item: LayoutItem): LayoutItem {
  const w = snapWidth(item.w);
  const x = snapX(item.x, w);
  return {
    ...item,
    x,
    w,
    y: Math.max(0, Math.round(item.y)),
    h: Math.max(1, Math.round(item.h)),
  };
}

/** Snap drag/resize results to the 12-column grid on stop. */
export function snapLayoutToGrid(layout: Layout): Layout {
  return layout.map(snapItem);
}
