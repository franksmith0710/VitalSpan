import type { DashboardLayoutV2, PixelLayoutWidget } from "../layoutUtils";
import type { PixelCanvasBounds, PixelRect } from "./geometry";

export type CollisionLayoutOptions = {
  gap?: number;
  minCanvasHeight?: number;
  bottomPadding?: number;
  /** 两轴重叠深度均需超过该值才算碰撞（拖拽预览抑制轻触即挤压） */
  minOverlap?: number;
};

/** 拖拽预览时，屏幕上两轴均需穿透该深度才触发邻组件下推（px） */
export const COLLISION_PREVIEW_SCREEN_TOLERANCE_PX = 12;

export function collisionPreviewOverlapTolerance(scale: number): number {
  const safeScale = scale > 0 ? scale : 1;
  return COLLISION_PREVIEW_SCREEN_TOLERANCE_PX / safeScale;
}

const PACK_SCAN_STEP = 8;

const DEFAULT_OPTIONS: Required<CollisionLayoutOptions> = {
  gap: 0,
  minCanvasHeight: 220,
  bottomPadding: 0,
  minOverlap: 0,
};

export function widgetRect(widget: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">): PixelRect {
  return { x: widget.x, y: widget.y, width: widget.width, height: widget.height };
}

export function rectsOverlap(
  a: PixelRect,
  b: PixelRect,
  gap = 0,
  minOverlap = 0,
): boolean {
  const touches =
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y;
  if (!touches || minOverlap <= 0) return touches;
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapX > minOverlap && overlapY > minOverlap;
}

function stableWidgetKey(widget: PixelLayoutWidget): [number, number, number, string] {
  return [widget.y, widget.x, widget.order, widget.id];
}

function compareWidgets(a: PixelLayoutWidget, b: PixelLayoutWidget): number {
  const [ay, ax, ao, aid] = stableWidgetKey(a);
  const [by, bx, bo, bid] = stableWidgetKey(b);
  if (ay !== by) return ay - by;
  if (ax !== bx) return ax - bx;
  if (ao !== bo) return ao - bo;
  return aid.localeCompare(bid);
}

function withRect(widget: PixelLayoutWidget, rect: PixelRect): PixelLayoutWidget {
  return { ...widget, ...rect };
}

function growCanvasHeight(
  widgets: PixelLayoutWidget[],
  canvas: PixelCanvasBounds,
  options: Required<CollisionLayoutOptions>,
): number {
  const lowest = widgets.reduce((max, widget) => Math.max(max, widget.y + widget.height), 0);
  return Math.max(options.minCanvasHeight, lowest + options.bottomPadding, canvas.height);
}

function applyPositions(
  layout: DashboardLayoutV2,
  positions: Map<string, PixelRect>,
  options: Required<CollisionLayoutOptions>,
): DashboardLayoutV2 {
  const widgets = layout.widgets.map((widget) => withRect(widget, positions.get(widget.id)!));
  return {
    ...layout,
    canvas: {
      ...layout.canvas,
      height: growCanvasHeight(widgets, layout.canvas, options),
    },
    widgets,
  };
}

function pushDown(
  positions: Map<string, PixelRect>,
  moverId: string,
  blockerId: string,
  options: Required<CollisionLayoutOptions>,
): boolean {
  const blocker = positions.get(blockerId)!;
  const mover = positions.get(moverId)!;
  if (!rectsOverlap(blocker, mover, options.gap, options.minOverlap)) return false;
  const gap = options.gap;
  const nextY = blocker.y + blocker.height + gap;
  if (mover.y >= nextY) return false;
  positions.set(moverId, { ...mover, y: Math.round(nextY) });
  return true;
}

function horizontalOverlap(a: PixelRect, b: PixelRect, gap = 0): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x;
}

function isBelowVacatedFootprint(rect: PixelRect, vacated: PixelRect, gap: number): boolean {
  if (!horizontalOverlap(rect, vacated, gap)) return false;
  return rect.y >= vacated.y + vacated.height + gap;
}

function widgetsSharingColumn(
  widgets: PixelLayoutWidget[],
  column: PixelRect,
  positions: Map<string, PixelRect>,
  gap: number,
  excludeId: string,
): PixelLayoutWidget[] {
  return widgets.filter((widget) => {
    if (widget.id === excludeId) return false;
    const rect = positions.get(widget.id);
    return rect ? horizontalOverlap(rect, column, gap) : false;
  });
}

function liftVacatedColumn(
  widgets: PixelLayoutWidget[],
  positions: Map<string, PixelRect>,
  vacated: PixelRect,
  activeId: string,
  gap: number,
): void {
  const column = widgets.filter((widget) => {
    if (widget.id === activeId) return false;
    const rect = positions.get(widget.id);
    return rect ? isBelowVacatedFootprint(rect, vacated, gap) : false;
  });
  const limit = column.length + 1;
  for (let step = 0; step < limit; step += 1) {
    if (!globalVerticalCompact(column, positions, gap)) break;
  }
}

/** 对标 DE moveItemUp：同列组件可上浮的最高 y */
function maxUpwardTop(
  rect: PixelRect,
  positions: Map<string, PixelRect>,
  excludeId: string,
  gap: number,
): number {
  let top = 0;
  for (const [id, other] of positions) {
    if (id === excludeId) continue;
    if (!horizontalOverlap(rect, other, gap)) continue;
    if (other.y + other.height + gap <= rect.y) {
      top = Math.max(top, other.y + other.height + gap);
    }
  }
  return top;
}

/** 全局垂直紧凑：按 y 顺序将各组件上浮填缝（DE 矩阵重力） */
function globalVerticalCompact(
  widgets: PixelLayoutWidget[],
  positions: Map<string, PixelRect>,
  gap: number,
  excludeIds?: ReadonlySet<string>,
): boolean {
  let changed = false;
  const sorted = [...widgets].sort(compareWidgets);
  for (const widget of sorted) {
    if (excludeIds?.has(widget.id)) continue;
    const rect = positions.get(widget.id);
    if (!rect) continue;
    const nextY = Math.round(maxUpwardTop(rect, positions, widget.id, gap));
    if (nextY < rect.y) {
      positions.set(widget.id, { ...rect, y: nextY });
      changed = true;
    }
  }
  return changed;
}

function cascadeFromBlocker(
  widgets: PixelLayoutWidget[],
  positions: Map<string, PixelRect>,
  blockerId: string,
  activeId: string,
  options: Required<CollisionLayoutOptions>,
): void {
  const limit = widgets.length * widgets.length;
  const queue = [blockerId];
  const queued = new Set([blockerId]);
  let steps = 0;

  while (queue.length > 0 && steps < limit) {
    steps += 1;
    const currentBlocker = queue.shift()!;
    const sorted = [...widgets].sort(compareWidgets);
    for (const candidate of sorted) {
      if (candidate.id === currentBlocker) continue;
      if (candidate.id === activeId) continue;
      if (pushDown(positions, candidate.id, currentBlocker, options)) {
        if (!queued.has(candidate.id)) {
          queue.push(candidate.id);
          queued.add(candidate.id);
        }
      }
    }
  }

  if (queue.length > 0) {
    throw new Error("resolvePixelCollisions exceeded cascade limit");
  }
}

export function resolvePixelCollisions(
  layout: DashboardLayoutV2,
  activeId: string,
  activeRect: PixelRect,
  options: CollisionLayoutOptions = {},
): DashboardLayoutV2 {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const positions = new Map(layout.widgets.map((widget) => [widget.id, widgetRect(widget)]));
  const roundedActive = {
    x: Math.round(activeRect.x),
    y: Math.round(activeRect.y),
    width: Math.round(activeRect.width),
    height: Math.round(activeRect.height),
  };

  const allowReflow = resolved.minOverlap <= 0;

  // DE movePlayer：同列旧占位下方的组件先上浮填缝（预览轻触容差时跳过，避免误抬升）
  const oldRect = positions.get(activeId);
  if (oldRect && allowReflow) {
    positions.delete(activeId);
    liftVacatedColumn(layout.widgets, positions, oldRect, activeId, resolved.gap);
  }

  positions.set(activeId, roundedActive);

  const settleLimit = layout.widgets.length + 1;
  const keepActiveY = new Set([activeId]);
  const activeColumn = widgetsSharingColumn(
    layout.widgets,
    roundedActive,
    positions,
    resolved.gap,
    activeId,
  );
  for (let step = 0; step < settleLimit; step += 1) {
    cascadeFromBlocker(layout.widgets, positions, activeId, activeId, resolved);
    if (
      !allowReflow ||
      !globalVerticalCompact(activeColumn, positions, resolved.gap, keepActiveY)
    ) {
      break;
    }
  }

  return applyPositions(layout, positions, resolved);
}

export function findNextOpenSlot(
  size: Pick<PixelRect, "width" | "height">,
  occupied: PixelRect[],
  canvas: PixelCanvasBounds,
  gap = DEFAULT_OPTIONS.gap,
): Pick<PixelRect, "x" | "y"> {
  if (occupied.length === 0) return { x: 0, y: 0 };

  const candidatePoints = new Set<string>();
  const addCandidate = (x: number, y: number) => {
    if (x < 0 || y < 0 || x + size.width > canvas.width || y + size.height > canvas.height) return;
    candidatePoints.add(`${x}:${y}`);
  };

  addCandidate(0, 0);
  for (const rect of occupied) {
    addCandidate(rect.x + rect.width + gap, rect.y);
    addCandidate(rect.x, rect.y + rect.height + gap);
    addCandidate(rect.x + rect.width + gap, rect.y + rect.height + gap);
  }

  const maxY =
    occupied.reduce((max, rect) => Math.max(max, rect.y + rect.height), 0) + size.height;
  for (let y = 0; y <= maxY; y += PACK_SCAN_STEP) {
    for (let x = 0; x <= canvas.width - size.width; x += PACK_SCAN_STEP) {
      addCandidate(x, y);
    }
  }

  let best: Pick<PixelRect, "x" | "y"> | null = null;
  let bestY = Number.POSITIVE_INFINITY;
  let bestX = Number.POSITIVE_INFINITY;

  for (const key of candidatePoints) {
    const [rawX, rawY] = key.split(":").map(Number);
    const x = rawX!;
    const y = rawY!;
    const candidate = { x, y, width: size.width, height: size.height };
    if (occupied.some((rect) => rectsOverlap(rect, candidate, gap))) continue;
    if (y < bestY || (y === bestY && x < bestX)) {
      bestY = y;
      bestX = x;
      best = { x, y };
    }
  }

  if (best) return best;

  const lowest = occupied.reduce((top, rect) =>
    rect.y + rect.height > top.y + top.height ? rect : top,
  );
  return { x: 0, y: lowest.y + lowest.height + gap };
}

export function packPixelLayoutSeamless(
  layout: DashboardLayoutV2,
  options: CollisionLayoutOptions = {},
): DashboardLayoutV2 {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const sorted = [...layout.widgets].sort(compareWidgets);
  const positions = new Map<string, PixelRect>();
  const placed: PixelRect[] = [];

  for (const widget of sorted) {
    const size = { width: widget.width, height: widget.height };
    const slot = findNextOpenSlot(size, placed, layout.canvas, resolved.gap);
    const rect = {
      x: Math.round(slot.x),
      y: Math.round(slot.y),
      width: size.width,
      height: size.height,
    };
    positions.set(widget.id, rect);
    placed.push(rect);
  }

  return applyPositions(layout, positions, resolved);
}

/** @deprecated Use packPixelLayoutSeamless */
export function normalizeOverlappingPixelLayout(
  layout: DashboardLayoutV2,
  options: CollisionLayoutOptions = {},
): DashboardLayoutV2 {
  return packPixelLayoutSeamless(layout, options);
}

export function layoutsOverlap(layout: DashboardLayoutV2, gap = 0): boolean {
  const widgets = layout.widgets;
  for (let i = 0; i < widgets.length; i += 1) {
    for (let j = i + 1; j < widgets.length; j += 1) {
      if (rectsOverlap(widgetRect(widgets[i]!), widgetRect(widgets[j]!), gap)) {
        return true;
      }
    }
  }
  return false;
}
