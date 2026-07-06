import type { Layout, LayoutItem } from "react-grid-layout/legacy";
import type { LayoutWidget } from "./layoutUtils";
import { sortWidgets } from "./layoutUtils";

const COL_SPANS: LayoutWidget["colSpan"][] = [4, 6, 8, 12];
export const GRID_ROW_HEIGHT = 80;
const MIN_CHART_ROWS = 2;

function snapColSpan(w: number): LayoutWidget["colSpan"] {
  let best: LayoutWidget["colSpan"] = 4;
  let min = Number.POSITIVE_INFINITY;
  for (const span of COL_SPANS) {
    const d = Math.abs(w - span);
    if (d < min) {
      min = d;
      best = span;
    }
  }
  return best;
}

export function widgetsToGridLayout(widgets: LayoutWidget[]): Layout {
  const sorted = sortWidgets(widgets);
  let x = 0;
  let y = 0;
  let rowMaxH = 0;
  const out: LayoutItem[] = [];
  for (const w of sorted) {
    const h = Math.max(MIN_CHART_ROWS, w.rowSpan);
    if (x + w.colSpan > 12) {
      x = 0;
      y += rowMaxH;
      rowMaxH = 0;
    }
    out.push({ i: w.id, x, y, w: w.colSpan, h, minW: 4, maxW: 12, minH: 1, maxH: 8 });
    x += w.colSpan;
    rowMaxH = Math.max(rowMaxH, h);
    if (x >= 12) {
      x = 0;
      y += rowMaxH;
      rowMaxH = 0;
    }
  }
  return out;
}

export function gridLayoutToWidgets(layout: Layout, widgets: LayoutWidget[]): LayoutWidget[] {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  return sorted.map((item, order) => {
    const base = byId.get(item.i);
    if (!base) throw new Error(`Unknown widget ${item.i}`);
    return {
      ...base,
      colSpan: snapColSpan(item.w),
      rowSpan: Math.min(8, Math.max(1, item.h)),
      order,
    };
  });
}
