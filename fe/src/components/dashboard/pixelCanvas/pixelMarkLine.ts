import type { PixelCanvasBounds, PixelRect } from "./geometry";

export type MarkLineId = "xt" | "xc" | "xb" | "yl" | "yc" | "yr";

export type MarkLineGuide = {
  id: MarkLineId;
  /** 横线为 y 坐标，竖线为 x 坐标 */
  position: number;
};

export type DragDirection = {
  isRightward: boolean;
  isDownward: boolean;
};

export const MARK_LINE_SCREEN_THRESHOLD_PX = 3;

export function markLineThreshold(scale: number): number {
  const safeScale = scale > 0 ? scale : 1;
  return MARK_LINE_SCREEN_THRESHOLD_PX / safeScale;
}

type RectBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type SnapCandidate = {
  line: MarkLineId;
  position: number;
  axis: "x" | "y";
  value: number;
};

function rectBounds(rect: PixelRect): RectBounds {
  return {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    centerX: rect.x + rect.width / 2,
    centerY: rect.y + rect.height / 2,
  };
}

function isNearly(a: number, b: number, threshold: number): boolean {
  return Math.abs(a - b) <= threshold;
}

function collectCandidates(
  active: PixelRect,
  other: PixelRect,
  threshold: number,
): SnapCandidate[] {
  const current = rectBounds(active);
  const target = rectBounds(other);
  const candidates: SnapCandidate[] = [];

  if (isNearly(current.top, target.top, threshold)) {
    candidates.push({ line: "xt", position: target.top, axis: "y", value: target.top });
  }
  if (isNearly(current.bottom, target.top, threshold)) {
    candidates.push({
      line: "xt",
      position: target.top,
      axis: "y",
      value: target.top - active.height,
    });
  }
  if (isNearly(current.centerY, target.centerY, threshold)) {
    candidates.push({
      line: "xc",
      position: target.centerY,
      axis: "y",
      value: target.centerY - active.height / 2,
    });
  }
  if (isNearly(current.top, target.bottom, threshold)) {
    candidates.push({
      line: "xb",
      position: target.bottom,
      axis: "y",
      value: target.bottom,
    });
  }
  if (isNearly(current.bottom, target.bottom, threshold)) {
    candidates.push({
      line: "xb",
      position: target.bottom,
      axis: "y",
      value: target.bottom - active.height,
    });
  }

  if (isNearly(current.left, target.left, threshold)) {
    candidates.push({ line: "yl", position: target.left, axis: "x", value: target.left });
  }
  if (isNearly(current.right, target.left, threshold)) {
    candidates.push({
      line: "yl",
      position: target.left,
      axis: "x",
      value: target.left - active.width,
    });
  }
  if (isNearly(current.centerX, target.centerX, threshold)) {
    candidates.push({
      line: "yc",
      position: target.centerX,
      axis: "x",
      value: target.centerX - active.width / 2,
    });
  }
  if (isNearly(current.left, target.right, threshold)) {
    candidates.push({
      line: "yr",
      position: target.right,
      axis: "x",
      value: target.right,
    });
  }
  if (isNearly(current.right, target.right, threshold)) {
    candidates.push({
      line: "yr",
      position: target.right,
      axis: "x",
      value: target.right - active.width,
    });
  }

  return candidates;
}

const HORIZONTAL_PRIORITY_DOWN = ["xb", "xc", "xt"] as const;
const HORIZONTAL_PRIORITY_UP = ["xt", "xc", "xb"] as const;
const VERTICAL_PRIORITY_RIGHT = ["yr", "yc", "yl"] as const;
const VERTICAL_PRIORITY_LEFT = ["yl", "yc", "yr"] as const;

function pickSnapCandidate(
  candidates: SnapCandidate[],
  axis: "x" | "y",
  dragDir: DragDirection,
): SnapCandidate | null {
  const axisCandidates = candidates.filter((item) => item.axis === axis);
  if (axisCandidates.length === 0) return null;

  const order =
    axis === "y"
      ? dragDir.isDownward
        ? HORIZONTAL_PRIORITY_DOWN
        : HORIZONTAL_PRIORITY_UP
      : dragDir.isRightward
        ? VERTICAL_PRIORITY_RIGHT
        : VERTICAL_PRIORITY_LEFT;

  for (const lineId of order) {
    const match = axisCandidates.find((item) => item.line === lineId);
    if (match) return match;
  }

  return axisCandidates[0] ?? null;
}

export function chooseVisibleMarkLines(
  guides: MarkLineGuide[],
  dragDir: DragDirection,
): MarkLineGuide[] {
  const visible: MarkLineGuide[] = [];

  const horizontalOrder = dragDir.isDownward
    ? HORIZONTAL_PRIORITY_DOWN
    : HORIZONTAL_PRIORITY_UP;
  for (const lineId of horizontalOrder) {
    const match = guides.find((guide) => guide.id === lineId);
    if (match) {
      visible.push(match);
      break;
    }
  }

  const verticalOrder = dragDir.isRightward
    ? VERTICAL_PRIORITY_RIGHT
    : VERTICAL_PRIORITY_LEFT;
  for (const lineId of verticalOrder) {
    const match = guides.find((guide) => guide.id === lineId);
    if (match) {
      visible.push(match);
      break;
    }
  }

  return visible;
}

export function computeMarkLineSnap(
  active: PixelRect,
  others: PixelRect[],
  options: {
    threshold: number;
    dragDir: DragDirection;
    canvas?: PixelCanvasBounds;
  },
): { rect: PixelRect; guides: MarkLineGuide[] } {
  const targets = [...others];
  if (options.canvas) {
    targets.push({
      x: 0,
      y: 0,
      width: options.canvas.width,
      height: options.canvas.height,
    });
  }

  const candidates = targets.flatMap((other) =>
    collectCandidates(active, other, options.threshold),
  );
  const ySnap = pickSnapCandidate(candidates, "y", options.dragDir);
  const xSnap = pickSnapCandidate(candidates, "x", options.dragDir);

  const snapped: PixelRect = {
    ...active,
    x: xSnap ? Math.round(xSnap.value) : active.x,
    y: ySnap ? Math.round(ySnap.value) : active.y,
  };

  const rawGuides: MarkLineGuide[] = [];
  if (ySnap) rawGuides.push({ id: ySnap.line, position: ySnap.position });
  if (xSnap) rawGuides.push({ id: xSnap.line, position: xSnap.position });

  return {
    rect: snapped,
    guides: chooseVisibleMarkLines(rawGuides, options.dragDir),
  };
}
