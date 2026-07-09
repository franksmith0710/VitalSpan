import type { Layout, LayoutItem } from "react-grid-layout/legacy";
import type { LayoutWidget } from "./layoutUtils";
import { sortWidgets } from "./layoutUtils";

/** 行高（px）；较小步进便于纵向微调，对齐 Superset 类 BI 画布 */
export const GRID_ROW_HEIGHT = 48;
const MIN_CHART_ROWS = 2;
const MAX_CHART_ROWS = 8;

function clampColSpan(w: number): number {
  return Math.min(12, Math.max(1, Math.round(w)));
}

function clampRowSpan(h: number): number {
  return Math.min(MAX_CHART_ROWS, Math.max(MIN_CHART_ROWS, Math.round(h)));
}

function itemBox(item: Pick<LayoutItem, "x" | "y" | "w" | "h">) {
  return item;
}

function itemsCollide(
  a: Pick<LayoutItem, "x" | "y" | "w" | "h">,
  b: Pick<LayoutItem, "x" | "y" | "w" | "h">,
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function layoutHasOverlap(layout: LayoutItem[]): boolean {
  for (let i = 0; i < layout.length; i += 1) {
    for (let j = i + 1; j < layout.length; j += 1) {
      if (itemsCollide(layout[i], layout[j])) return true;
    }
  }
  return false;
}

function gridItemFromWidget(w: LayoutWidget): LayoutItem {
  return {
    i: w.id,
    x: w.gridX ?? 0,
    y: w.gridY ?? 0,
    w: clampColSpan(w.colSpan),
    h: clampRowSpan(w.rowSpan),
    minW: 1,
    maxW: 12,
    minH: MIN_CHART_ROWS,
    maxH: MAX_CHART_ROWS,
  };
}

function packFlowLayout(widgets: LayoutWidget[]): LayoutItem[] {
  const sorted = sortWidgets(widgets);
  let x = 0;
  let y = 0;
  let rowMaxH = 0;
  const out: LayoutItem[] = [];
  for (const w of sorted) {
    const span = clampColSpan(w.colSpan);
    const h = clampRowSpan(w.rowSpan);
    if (x + span > 12) {
      x = 0;
      y += rowMaxH;
      rowMaxH = 0;
    }
    out.push({
      i: w.id,
      x,
      y,
      w: span,
      h,
      minW: 1,
      maxW: 12,
      minH: MIN_CHART_ROWS,
      maxH: MAX_CHART_ROWS,
    });
    x += span;
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
  if (!sorted.length) return [];

  const allPositioned = sorted.every((w) => w.gridX != null && w.gridY != null);
  if (allPositioned) {
    const items = sorted.map((w) => ({
      ...gridItemFromWidget(w),
      x: w.gridX!,
      y: w.gridY!,
    }));
    if (!layoutHasOverlap(items)) return items;
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
      colSpan: clampColSpan(item.w),
      rowSpan: clampRowSpan(item.h),
      gridX: item.x,
      gridY: item.y,
      order,
    };
  });
}

/** 修复重叠/缺坐标的历史布局 */
export function normalizeWidgetLayout(widgets: LayoutWidget[]): LayoutWidget[] {
  if (!widgets.length) return widgets;
  return gridLayoutToWidgets(widgetsToGridLayout(widgets), widgets);
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
    colSpan: clampColSpan(widget.colSpan),
    rowSpan: clampRowSpan(widget.rowSpan),
    gridX: 0,
    gridY: maxY,
  };
}

/** 拖放落点：优先使用指针位置，冲突时向下顺延 */
export function placeWidgetAt(
  widgets: LayoutWidget[],
  widget: LayoutWidget,
  preferredX: number,
  preferredY: number,
): LayoutWidget {
  const w = clampColSpan(widget.colSpan);
  const h = clampRowSpan(widget.rowSpan);
  const layout = widgetsToGridLayout(widgets);
  let x = Math.min(12 - w, Math.max(0, Math.round(preferredX)));
  let y = Math.max(0, Math.round(preferredY));

  const collidesAt = (tx: number, ty: number) =>
    layout.some((item) => itemsCollide(itemBox({ x: tx, y: ty, w, h }), item));

  let tries = 0;
  while (collidesAt(x, y) && tries < 120) {
    y += 1;
    tries += 1;
  }

  if (collidesAt(x, y)) {
    return placeNewWidget(widgets, widget);
  }

  return {
    ...widget,
    colSpan: w,
    rowSpan: h,
    gridX: x,
    gridY: y,
  };
}
