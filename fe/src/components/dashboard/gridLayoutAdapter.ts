import type { Layout, LayoutItem } from "react-grid-layout/legacy";
import type { LayoutWidget } from "./layoutUtils";
import { sortWidgets } from "./layoutUtils";

const COL_SPANS: LayoutWidget["colSpan"][] = [4, 6, 8, 12];
export const GRID_ROW_HEIGHT = 72;
const MIN_CHART_ROWS = 3;

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

function packFlowLayout(widgets: LayoutWidget[]): LayoutItem[] {
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
    out.push({
      i: w.id,
      x,
      y,
      w: w.colSpan,
      h,
      minW: 4,
      maxW: 12,
      minH: MIN_CHART_ROWS,
      maxH: 10,
    });
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

export function widgetsToGridLayout(widgets: LayoutWidget[]): Layout {
  const sorted = sortWidgets(widgets);
  const positioned = sorted.filter((w) => w.gridX != null && w.gridY != null);
  if (positioned.length === sorted.length) {
    return sorted.map((w) => ({
      i: w.id,
      x: w.gridX!,
      y: w.gridY!,
      w: w.colSpan,
      h: Math.max(MIN_CHART_ROWS, w.rowSpan),
      minW: 4,
      maxW: 12,
      minH: MIN_CHART_ROWS,
      maxH: 10,
    }));
  }
  return packFlowLayout(sorted);
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
      rowSpan: Math.min(10, Math.max(MIN_CHART_ROWS, item.h)),
      gridX: item.x,
      gridY: item.y,
      order,
    };
  });
}

/** 为新组件计算画布底部空位 */
export function placeNewWidget(widgets: LayoutWidget[], widget: LayoutWidget): LayoutWidget {
  const layout = widgetsToGridLayout(widgets);
  let maxY = 0;
  for (const item of layout) {
    maxY = Math.max(maxY, item.y + item.h);
  }
  return {
    ...widget,
    rowSpan: Math.max(MIN_CHART_ROWS, widget.rowSpan),
    gridX: 0,
    gridY: maxY,
  };
}
