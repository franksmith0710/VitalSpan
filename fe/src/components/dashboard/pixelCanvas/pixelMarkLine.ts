import type { PixelCanvasBounds, PixelInteractionKind, PixelRect } from "./geometry";

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

/** DataEase `MarkLine.vue` 默认 diff（画布逻辑坐标 px） */
export const MARK_LINE_CANVAS_THRESHOLD_PX = 3;

/** 缩放过小时保证屏幕上仍有可感知吸附区 */
export const MARK_LINE_SCREEN_MIN_THRESHOLD_PX = 8;

const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

export function markLineThreshold(scale: number): number {
  const safeScale = scale > 0 ? scale : 1;
  return Math.max(
    MARK_LINE_CANVAS_THRESHOLD_PX,
    MARK_LINE_SCREEN_MIN_THRESHOLD_PX / safeScale,
  );
}

export type MarkLineSnapOptions = {
  threshold: number;
  dragDir: DragDirection;
  canvas?: PixelCanvasBounds;
  /** shape 外层 padding（画布逻辑 px），对标 DE curGap */
  gap?: number;
  /** move / 八向 resize；决定吸附落在哪条边上 */
  interactionKind?: PixelInteractionKind;
  /** resize 时固定对边的锚点矩形 */
  anchorRect?: PixelRect;
};

type RectBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type ActiveEdge = "left" | "right" | "top" | "bottom" | "centerX" | "centerY";

type SnapCandidate = {
  line: MarkLineId;
  position: number;
  axis: "x" | "y";
  activeEdge: ActiveEdge;
  distance: number;
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

function axisDistance(a: number, b: number): number {
  return Math.abs(a - b);
}

function activeCoord(edge: ActiveEdge, bounds: RectBounds): number {
  switch (edge) {
    case "left":
      return bounds.left;
    case "right":
      return bounds.right;
    case "top":
      return bounds.top;
    case "bottom":
      return bounds.bottom;
    case "centerX":
      return bounds.centerX;
    case "centerY":
      return bounds.centerY;
  }
}

function pushCandidate(
  candidates: SnapCandidate[],
  line: MarkLineId,
  position: number,
  axis: "x" | "y",
  activeEdge: ActiveEdge,
  current: RectBounds,
) {
  candidates.push({
    line,
    position,
    axis,
    activeEdge,
    distance: axisDistance(activeCoord(activeEdge, current), position),
  });
}

function collectFlushCandidates(
  active: PixelRect,
  target: RectBounds,
  threshold: number,
  candidates: SnapCandidate[],
) {
  const current = rectBounds(active);

  if (axisDistance(current.top, target.top) <= threshold) {
    pushCandidate(candidates, "xt", target.top, "y", "top", current);
  }
  if (axisDistance(current.bottom, target.top) <= threshold) {
    pushCandidate(candidates, "xt", target.top, "y", "bottom", current);
  }
  if (axisDistance(current.centerY, target.centerY) <= threshold) {
    pushCandidate(candidates, "xc", target.centerY, "y", "centerY", current);
  }
  if (axisDistance(current.top, target.bottom) <= threshold) {
    pushCandidate(candidates, "xb", target.bottom, "y", "top", current);
  }
  if (axisDistance(current.bottom, target.bottom) <= threshold) {
    pushCandidate(candidates, "xb", target.bottom, "y", "bottom", current);
  }

  if (axisDistance(current.left, target.left) <= threshold) {
    pushCandidate(candidates, "yl", target.left, "x", "left", current);
  }
  if (axisDistance(current.right, target.left) <= threshold) {
    pushCandidate(candidates, "yl", target.left, "x", "right", current);
  }
  if (axisDistance(current.centerX, target.centerX) <= threshold) {
    pushCandidate(candidates, "yc", target.centerX, "x", "centerX", current);
  }
  if (axisDistance(current.left, target.right) <= threshold) {
    pushCandidate(candidates, "yr", target.right, "x", "left", current);
  }
  if (axisDistance(current.right, target.right) <= threshold) {
    pushCandidate(candidates, "yr", target.right, "x", "right", current);
  }
}

function collectGapChannelCandidates(
  active: PixelRect,
  target: RectBounds,
  gap: number,
  threshold: number,
  candidates: SnapCandidate[],
) {
  if (gap <= 0) return;
  const current = rectBounds(active);
  const channelRight = target.right + gap;
  const channelLeft = target.left - gap;
  const channelBottom = target.bottom + gap;
  const channelTop = target.top - gap;

  if (axisDistance(current.left, channelRight) <= threshold) {
    pushCandidate(candidates, "yl", channelRight, "x", "left", current);
  }
  if (axisDistance(current.right, channelLeft) <= threshold) {
    pushCandidate(candidates, "yl", channelLeft, "x", "right", current);
  }
  if (axisDistance(current.top, channelBottom) <= threshold) {
    pushCandidate(candidates, "xt", channelBottom, "y", "top", current);
  }
  if (axisDistance(current.bottom, channelTop) <= threshold) {
    pushCandidate(candidates, "xt", channelTop, "y", "bottom", current);
  }
}

function collectCandidates(
  active: PixelRect,
  other: PixelRect,
  threshold: number,
  gap: number,
): SnapCandidate[] {
  const target = rectBounds(other);
  const candidates: SnapCandidate[] = [];
  collectFlushCandidates(active, target, threshold, candidates);
  collectGapChannelCandidates(active, target, gap, threshold, candidates);
  return candidates;
}

const HORIZONTAL_PRIORITY_DOWN = ["xb", "xc", "xt"] as const;
const HORIZONTAL_PRIORITY_UP = ["xt", "xc", "xb"] as const;
const VERTICAL_PRIORITY_RIGHT = ["yr", "yc", "yl"] as const;
const VERTICAL_PRIORITY_LEFT = ["yl", "yc", "yr"] as const;

function priorityIndex(line: MarkLineId, axis: "x" | "y", dragDir: DragDirection): number {
  const order =
    axis === "y"
      ? dragDir.isDownward
        ? HORIZONTAL_PRIORITY_DOWN
        : HORIZONTAL_PRIORITY_UP
      : dragDir.isRightward
        ? VERTICAL_PRIORITY_RIGHT
        : VERTICAL_PRIORITY_LEFT;
  const index = order.indexOf(line as (typeof order)[number]);
  return index === -1 ? order.length : index;
}

function pickBestSnapCandidate(
  candidates: SnapCandidate[],
  axis: "x" | "y",
  threshold: number,
  dragDir: DragDirection,
  kind: PixelInteractionKind,
): SnapCandidate | null {
  const axisCandidates = candidates.filter(
    (item) =>
      item.axis === axis &&
      item.distance <= threshold &&
      snapCandidateApplies(item, kind),
  );
  if (axisCandidates.length === 0) return null;

  axisCandidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return priorityIndex(a.line, axis, dragDir) - priorityIndex(b.line, axis, dragDir);
  });
  return axisCandidates[0] ?? null;
}

function movesWest(kind: PixelInteractionKind): boolean {
  return kind === "move" || kind.includes("w");
}

function movesEast(kind: PixelInteractionKind): boolean {
  return kind === "move" || kind.includes("e");
}

function movesNorth(kind: PixelInteractionKind): boolean {
  return kind === "move" || kind.includes("n");
}

function movesSouth(kind: PixelInteractionKind): boolean {
  return kind === "move" || kind.includes("s");
}

/** resize 时仅吸附当前正在移动的那条边/轴 */
export function snapCandidateApplies(
  candidate: SnapCandidate,
  kind: PixelInteractionKind,
): boolean {
  if (kind === "move") return true;
  switch (candidate.activeEdge) {
    case "left":
      return movesWest(kind);
    case "right":
      return movesEast(kind);
    case "top":
      return movesNorth(kind);
    case "bottom":
      return movesSouth(kind);
    case "centerX":
      return movesWest(kind) && movesEast(kind);
    case "centerY":
      return movesNorth(kind) && movesSouth(kind);
    default:
      return false;
  }
}

export function applyMarkLineSnapCandidate(
  rect: PixelRect,
  snap: SnapCandidate,
  kind: PixelInteractionKind,
  anchor: PixelRect,
): PixelRect {
  const position = Math.round(snap.position);

  if (snap.axis === "x") {
    if (snap.activeEdge === "left" && movesWest(kind)) {
      if (kind === "move") return { ...rect, x: position };
      const right = anchor.x + anchor.width;
      return { ...rect, x: position, width: Math.max(MIN_WIDTH, right - position) };
    }
    if (snap.activeEdge === "right" && movesEast(kind)) {
      if (kind === "move") return { ...rect, x: position - rect.width };
      return { ...rect, width: Math.max(MIN_WIDTH, position - rect.x) };
    }
    if (snap.activeEdge === "centerX" && kind === "move") {
      return { ...rect, x: position - rect.width / 2 };
    }
    return rect;
  }

  if (snap.activeEdge === "top" && movesNorth(kind)) {
    if (kind === "move") return { ...rect, y: position };
    const bottom = anchor.y + anchor.height;
    return { ...rect, y: position, height: Math.max(MIN_HEIGHT, bottom - position) };
  }
  if (snap.activeEdge === "bottom" && movesSouth(kind)) {
    if (kind === "move") return { ...rect, y: position - rect.height };
    return { ...rect, height: Math.max(MIN_HEIGHT, position - rect.y) };
  }
  if (snap.activeEdge === "centerY" && kind === "move") {
    return { ...rect, y: position - rect.height / 2 };
  }
  return rect;
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
  options: MarkLineSnapOptions,
): { rect: PixelRect; guides: MarkLineGuide[] } {
  const gap = Math.max(0, options.gap ?? 0);
  const kind = options.interactionKind ?? "move";
  const anchor = options.anchorRect ?? active;
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
    collectCandidates(active, other, options.threshold, gap),
  );
  const ySnap = pickBestSnapCandidate(
    candidates,
    "y",
    options.threshold,
    options.dragDir,
    kind,
  );
  const xSnap = pickBestSnapCandidate(
    candidates,
    "x",
    options.threshold,
    options.dragDir,
    kind,
  );

  let snapped: PixelRect = { ...active };
  if (ySnap) snapped = applyMarkLineSnapCandidate(snapped, ySnap, kind, anchor);
  if (xSnap) snapped = applyMarkLineSnapCandidate(snapped, xSnap, kind, anchor);
  snapped = {
    ...snapped,
    x: Math.round(snapped.x),
    y: Math.round(snapped.y),
    width: Math.round(snapped.width),
    height: Math.round(snapped.height),
  };

  const rawGuides: MarkLineGuide[] = [];
  if (ySnap) rawGuides.push({ id: ySnap.line, position: ySnap.position });
  if (xSnap) rawGuides.push({ id: xSnap.line, position: xSnap.position });

  return {
    rect: snapped,
    guides: chooseVisibleMarkLines(rawGuides, options.dragDir),
  };
}
