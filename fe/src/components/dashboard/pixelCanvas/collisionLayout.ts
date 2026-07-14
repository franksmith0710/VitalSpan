import type { DashboardLayoutV2, PixelLayoutWidget } from "../layoutUtils";
import type { PixelCanvasBounds, PixelRect } from "./geometry";

export type CollisionLayoutOptions = {
  gap?: number;
  minCanvasHeight?: number;
  bottomPadding?: number;
};

const PACK_SCAN_STEP = 8;

const DEFAULT_OPTIONS: Required<CollisionLayoutOptions> = {
  gap: 0,
  minCanvasHeight: 220,
  bottomPadding: 0,
};

export function widgetRect(widget: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">): PixelRect {
  return { x: widget.x, y: widget.y, width: widget.width, height: widget.height };
}

export function rectsOverlap(a: PixelRect, b: PixelRect, gap = 0): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
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
  gap: number,
): boolean {
  const blocker = positions.get(blockerId)!;
  const mover = positions.get(moverId)!;
  if (!rectsOverlap(blocker, mover, gap)) return false;
  const nextY = blocker.y + blocker.height + gap;
  if (mover.y >= nextY) return false;
  positions.set(moverId, { ...mover, y: Math.round(nextY) });
  return true;
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
      if (pushDown(positions, candidate.id, currentBlocker, options.gap)) {
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
  positions.set(activeId, {
    x: Math.round(activeRect.x),
    y: Math.round(activeRect.y),
    width: Math.round(activeRect.width),
    height: Math.round(activeRect.height),
  });
  cascadeFromBlocker(layout.widgets, positions, activeId, activeId, resolved);
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
