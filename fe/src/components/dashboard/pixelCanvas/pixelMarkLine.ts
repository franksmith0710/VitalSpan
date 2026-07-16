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

/** DataEase `MarkLine.vue` 默认 diff（屏幕约 3px，换算为画布逻辑坐标） */
export const MARK_LINE_CANVAS_THRESHOLD_PX = 3;

const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

/** DataEase `MarkLine.vue`：`diff=3` 为画布逻辑坐标，不随缩放换算 */
export function markLineThreshold(_scale: number): number {
  return MARK_LINE_CANVAS_THRESHOLD_PX;
}

export type MarkLineSnapOptions = {
  threshold: number;
  dragDir: DragDirection;
  canvas?: PixelCanvasBounds;
  /** @deprecated DE MarkLine 仅比较组件外框，不单独处理 curGap 中线 */
  gap?: number;
  /** @deprecated */
  chromeInset?: { top: number; right: number; bottom: number; left: number };
  interactionKind?: PixelInteractionKind;
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
  /** 吸附写入布局的外框坐标 */
  position: number;
  /** 参考线绘制坐标（有间隙时为视觉边或间隙中线） */
  guidePosition: number;
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

function pushCandidate(
  candidates: SnapCandidate[],
  line: MarkLineId,
  position: number,
  axis: "x" | "y",
  activeEdge: ActiveEdge,
  distance: number,
  guidePosition = position,
) {
  candidates.push({
    line,
    position,
    guidePosition,
    axis,
    activeEdge,
    distance,
  });
}

function collectFlushCandidates(
  active: PixelRect,
  other: PixelRect,
  threshold: number,
  candidates: SnapCandidate[],
) {
  const current = rectBounds(active);
  const target = rectBounds(other);

  if (axisDistance(current.top, target.top) <= threshold) {
    pushCandidate(candidates, "xt", target.top, "y", "top", axisDistance(current.top, target.top), target.top);
  }
  if (axisDistance(current.bottom, target.top) <= threshold) {
    pushCandidate(
      candidates,
      "xt",
      target.top,
      "y",
      "bottom",
      axisDistance(current.bottom, target.top),
      target.top,
    );
  }
  if (axisDistance(current.centerY, target.centerY) <= threshold) {
    pushCandidate(
      candidates,
      "xc",
      target.centerY,
      "y",
      "centerY",
      axisDistance(current.centerY, target.centerY),
      target.centerY,
    );
  }
  if (axisDistance(current.top, target.bottom) <= threshold) {
    pushCandidate(
      candidates,
      "xb",
      target.bottom,
      "y",
      "top",
      axisDistance(current.top, target.bottom),
      target.bottom,
    );
  }
  if (axisDistance(current.bottom, target.bottom) <= threshold) {
    pushCandidate(
      candidates,
      "xb",
      target.bottom,
      "y",
      "bottom",
      axisDistance(current.bottom, target.bottom),
      target.bottom,
    );
  }

  if (axisDistance(current.left, target.left) <= threshold) {
    pushCandidate(candidates, "yl", target.left, "x", "left", axisDistance(current.left, target.left), target.left);
  }
  if (axisDistance(current.right, target.left) <= threshold) {
    pushCandidate(
      candidates,
      "yl",
      target.left,
      "x",
      "right",
      axisDistance(current.right, target.left),
      target.left,
    );
  }
  if (axisDistance(current.centerX, target.centerX) <= threshold) {
    pushCandidate(
      candidates,
      "yc",
      target.centerX,
      "x",
      "centerX",
      axisDistance(current.centerX, target.centerX),
      target.centerX,
    );
  }
  if (axisDistance(current.left, target.right) <= threshold) {
    pushCandidate(
      candidates,
      "yr",
      target.right,
      "x",
      "left",
      axisDistance(current.left, target.right),
      target.right,
    );
  }
  if (axisDistance(current.right, target.right) <= threshold) {
    pushCandidate(
      candidates,
      "yr",
      target.right,
      "x",
      "right",
      axisDistance(current.right, target.right),
      target.right,
    );
  }
}

function collectCandidates(active: PixelRect, other: PixelRect, threshold: number): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];
  collectFlushCandidates(active, other, threshold, candidates);
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
  const kind = options.interactionKind ?? "move";
  const anchor = options.anchorRect ?? active;
  const candidates = others.flatMap((other) =>
    collectCandidates(active, other, options.threshold),
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
  if (ySnap) rawGuides.push({ id: ySnap.line, position: ySnap.guidePosition });
  if (xSnap) rawGuides.push({ id: xSnap.line, position: xSnap.guidePosition });

  return {
    rect: snapped,
    guides: chooseVisibleMarkLines(rawGuides, options.dragDir),
  };
}
