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

/** DE curGap：内层可视区域（对称 padding） */
function visualBounds(rect: PixelRect, gap: number): RectBounds {
  if (gap <= 0) return rectBounds(rect);
  const outer = rectBounds(rect);
  const left = outer.left + gap;
  const top = outer.top + gap;
  const right = outer.right - gap;
  const bottom = outer.bottom - gap;
  if (right <= left || bottom <= top) return outer;
  return {
    left,
    top,
    right,
    bottom,
    centerX: outer.centerX,
    centerY: outer.centerY,
  };
}

function gapMidline(before: number, after: number): number {
  return (before + after) / 2;
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
  guidePosition = position,
) {
  candidates.push({
    line,
    position,
    guidePosition,
    axis,
    activeEdge,
    distance: axisDistance(activeCoord(activeEdge, current), position),
  });
}

function collectFlushCandidates(
  active: PixelRect,
  other: PixelRect,
  threshold: number,
  gap: number,
  candidates: SnapCandidate[],
) {
  const currentOuter = rectBounds(active);
  const targetOuter = rectBounds(other);
  const current = gap > 0 ? visualBounds(active, gap) : currentOuter;
  const target = gap > 0 ? visualBounds(other, gap) : targetOuter;

  if (axisDistance(current.top, target.top) <= threshold) {
    pushCandidate(candidates, "xt", targetOuter.top, "y", "top", currentOuter, target.top);
  }
  if (axisDistance(current.bottom, target.top) <= threshold) {
    pushCandidate(candidates, "xt", targetOuter.top, "y", "bottom", currentOuter, target.top);
  }
  if (axisDistance(current.centerY, target.centerY) <= threshold) {
    pushCandidate(
      candidates,
      "xc",
      targetOuter.centerY,
      "y",
      "centerY",
      currentOuter,
      target.centerY,
    );
  }
  if (axisDistance(current.top, target.bottom) <= threshold) {
    pushCandidate(candidates, "xb", targetOuter.bottom, "y", "top", currentOuter, target.bottom);
  }
  if (axisDistance(current.bottom, target.bottom) <= threshold) {
    pushCandidate(
      candidates,
      "xb",
      targetOuter.bottom,
      "y",
      "bottom",
      currentOuter,
      target.bottom,
    );
  }

  if (axisDistance(current.left, target.left) <= threshold) {
    pushCandidate(candidates, "yl", targetOuter.left, "x", "left", currentOuter, target.left);
  }
  if (axisDistance(current.right, target.left) <= threshold) {
    pushCandidate(candidates, "yl", targetOuter.left, "x", "right", currentOuter, target.left);
  }
  if (axisDistance(current.centerX, target.centerX) <= threshold) {
    pushCandidate(
      candidates,
      "yc",
      targetOuter.centerX,
      "x",
      "centerX",
      currentOuter,
      target.centerX,
    );
  }
  if (axisDistance(current.left, target.right) <= threshold) {
    pushCandidate(candidates, "yr", targetOuter.right, "x", "left", currentOuter, target.right);
  }
  if (axisDistance(current.right, target.right) <= threshold) {
    pushCandidate(candidates, "yr", targetOuter.right, "x", "right", currentOuter, target.right);
  }
}

/** 邻接外框贴齐时，参考线落在两组件间隙中线（DE curGap 外框相切） */
function collectGapAdjacencyCandidates(
  active: PixelRect,
  other: PixelRect,
  gap: number,
  threshold: number,
  candidates: SnapCandidate[],
) {
  if (gap <= 0) return;
  const current = rectBounds(active);
  const target = rectBounds(other);

  if (axisDistance(current.left, target.right) <= threshold) {
    const junction = target.right;
    pushCandidate(
      candidates,
      "yl",
      junction,
      "x",
      "left",
      current,
      gapMidline(target.right - gap, junction + gap),
    );
  }
  if (axisDistance(current.right, target.left) <= threshold) {
    const junction = target.left;
    pushCandidate(
      candidates,
      "yr",
      junction,
      "x",
      "right",
      current,
      gapMidline(junction - gap, target.left + gap),
    );
  }
  if (axisDistance(current.top, target.bottom) <= threshold) {
    const junction = target.bottom;
    pushCandidate(
      candidates,
      "xt",
      junction,
      "y",
      "top",
      current,
      gapMidline(target.bottom - gap, junction + gap),
    );
  }
  if (axisDistance(current.bottom, target.top) <= threshold) {
    const junction = target.top;
    pushCandidate(
      candidates,
      "xb",
      junction,
      "y",
      "bottom",
      current,
      gapMidline(junction - gap, target.top + gap),
    );
  }
}

function collectCandidates(
  active: PixelRect,
  other: PixelRect,
  threshold: number,
  gap: number,
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];
  collectFlushCandidates(active, other, threshold, gap, candidates);
  collectGapAdjacencyCandidates(active, other, gap, threshold, candidates);
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
  if (ySnap) rawGuides.push({ id: ySnap.line, position: ySnap.guidePosition });
  if (xSnap) rawGuides.push({ id: xSnap.line, position: xSnap.guidePosition });

  return {
    rect: snapped,
    guides: chooseVisibleMarkLines(rawGuides, options.dragDir),
  };
}
