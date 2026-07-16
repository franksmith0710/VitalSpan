import type { DashboardLayoutV2, PixelLayoutWidget } from "../layoutUtils";
import type { PixelCanvasBounds, PixelRect } from "./geometry";

export type CollisionLayoutOptions = {
  gap?: number;
  minCanvasHeight?: number;
  bottomPadding?: number;
  /** @deprecated DE 矩阵 reflow 不使用预览容差 */
  minOverlap?: number;
  /** @deprecated DE reflow 在松手时一次性结算 */
  skipVerticalCompact?: boolean;
};

const PACK_SCAN_STEP = 8;

const DEFAULT_OPTIONS: Required<Omit<CollisionLayoutOptions, "skipVerticalCompact">> & {
  skipVerticalCompact: boolean;
} = {
  gap: 0,
  minCanvasHeight: 220,
  bottomPadding: 0,
  minOverlap: 0,
  skipVerticalCompact: false,
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

function horizontalOverlap(a: PixelRect, b: PixelRect, gap = 0): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x;
}

function isBelowVacatedFootprint(rect: PixelRect, vacated: PixelRect, gap: number): boolean {
  if (!horizontalOverlap(rect, vacated, gap)) return false;
  return rect.y >= vacated.y + vacated.height + gap;
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

/** DE findBelowItems：同列中位于 item 下方的首层组件 */
function findBelowItemsInColumn(
  widgets: PixelLayoutWidget[],
  positions: Map<string, PixelRect>,
  itemId: string,
  gap: number,
): PixelLayoutWidget[] {
  const item = positions.get(itemId);
  if (!item) return [];
  return widgets
    .filter((widget) => widget.id !== itemId)
    .filter((widget) => {
      const rect = positions.get(widget.id);
      return rect ? horizontalOverlap(rect, item, gap) && rect.y >= item.y : false;
    })
    .sort(compareWidgets);
}

/** DE moveItemDown：递归下推同列被占位组件 */
function moveItemDown(
  widgets: PixelLayoutWidget[],
  positions: Map<string, PixelRect>,
  itemId: string,
  deltaY: number,
  gap: number,
  depth = 0,
): void {
  const limit = widgets.length * widgets.length;
  if (depth > limit) {
    throw new Error("moveItemDown exceeded cascade limit");
  }
  const item = positions.get(itemId);
  if (!item || deltaY <= 0) return;
  positions.set(itemId, { ...item, y: Math.round(item.y + deltaY) });
  const moved = positions.get(itemId)!;
  for (const below of findBelowItemsInColumn(widgets, positions, itemId, gap)) {
    const belowRect = positions.get(below.id)!;
    const moveSize = moved.y + moved.height + gap - belowRect.y;
    if (moveSize > 0) {
      moveItemDown(widgets, positions, below.id, moveSize, gap, depth + 1);
    }
  }
}

/** DE emptyTargetCell：落位时清空目标区占位（凡与目标外框重叠的块下推） */
function emptyTargetFootprint(
  widgets: PixelLayoutWidget[],
  positions: Map<string, PixelRect>,
  activeId: string,
  target: PixelRect,
  gap: number,
): void {
  const candidates = widgets
    .filter((widget) => widget.id !== activeId)
    .filter((widget) => {
      const rect = positions.get(widget.id)!;
      return horizontalOverlap(rect, target, gap) && rectsOverlap(rect, target, gap);
    })
    .sort(compareWidgets);

  for (const blocked of candidates) {
    const blockedRect = positions.get(blocked.id)!;
    const moveSize = target.y + target.height + gap - blockedRect.y;
    if (moveSize > 0) {
      moveItemDown(widgets, positions, blocked.id, moveSize, gap);
    }
  }
}

/**
 * 对标 DataEase CanvasCore movePlayer / resizePlayer：
 * 1. 旧占位同列上浮（moveItemUp）
 * 2. 写入新外框
 * 3. 目标区占位下推（emptyTargetCell + moveItemDown）
 *
 * 拖动过程中仅 MarkLine 吸附，不做邻组件 preview 推挤。
 */
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

  const oldRect = positions.get(activeId);
  const shouldVacateLift =
    oldRect &&
    (roundedActive.y !== oldRect.y ||
      roundedActive.x !== oldRect.x ||
      roundedActive.height < oldRect.height);

  if (shouldVacateLift) {
    positions.delete(activeId);
    liftVacatedColumn(layout.widgets, positions, oldRect, activeId, resolved.gap);
  }

  positions.set(activeId, roundedActive);
  emptyTargetFootprint(layout.widgets, positions, activeId, roundedActive, resolved.gap);

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
