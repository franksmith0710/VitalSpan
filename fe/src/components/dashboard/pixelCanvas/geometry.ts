export type PixelPoint = { x: number; y: number };
export type PixelRect = PixelPoint & { width: number; height: number };
export type PixelCanvasBounds = { width: number; height: number };
export type ResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type PixelInteractionKind = "move" | ResizeDirection;

export const RESIZE_DIRECTIONS: ResizeDirection[] = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw",
];

export const RESIZE_LABELS: Record<ResizeDirection, string> = {
  n: "上",
  ne: "右上",
  e: "右",
  se: "右下",
  s: "下",
  sw: "左下",
  w: "左",
  nw: "左上",
};

export const RESIZE_CURSORS: Record<ResizeDirection, string> = {
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
  nw: "nwse-resize",
};

const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundedRect(x: number, y: number, width: number, height: number): PixelRect {
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function screenDeltaToCanvas(delta: PixelPoint, scale: number): PixelPoint {
  const safeScale = scale > 0 ? scale : 1;
  return {
    x: delta.x / safeScale,
    y: delta.y / safeScale,
  };
}

export type ScaledCanvasMetrics = {
  scale: number;
  contentWidth: number;
  contentHeight: number;
  /** Stage `left` inside pixel-canvas-content */
  stageLeft: number;
  /** Center content block when letterboxed (component scale mode) */
  centerContent: boolean;
};

/** DE 画板规范高度；缩放比例按设计尺寸而非内容撑开后的高度 */
export const CANVAS_SCALE_DESIGN_HEIGHT = 900;

const SCALE_HEIGHT_FLOOR = 320;

/** 对标 DE `canvasStyleData.height`：碰撞撑高后的 canvas.height 不参与缩放分母 */
export function resolveScaleDesignHeight(canvasHeight: number): number {
  return Math.max(SCALE_HEIGHT_FLOOR, Math.min(canvasHeight, CANVAS_SCALE_DESIGN_HEIGHT));
}

/** 吸收亚像素缝；canvas 模式贴满可用宽，component 模式在误差内贴满 */
export function snapScaledContentWidth(
  scaledWidth: number,
  availableWidth: number,
  scaleMode: "canvas" | "component",
): number {
  const safeAvailable = Math.max(0, availableWidth);
  if (scaleMode === "canvas") {
    return Math.round(safeAvailable);
  }
  const gap = safeAvailable - scaledWidth;
  if (gap >= 0 && gap < 2) {
    return Math.round(safeAvailable);
  }
  return Math.min(Math.ceil(scaledWidth), Math.round(safeAvailable));
}

export function scaledCanvasMetrics(
  hostWidth: number,
  hostHeight: number,
  canvasWidth: number,
  designCanvasHeight: number,
  contentCanvasHeight: number,
  gutter = 0,
  scaleMode: "canvas" | "component" = "canvas",
): ScaledCanvasMetrics {
  const availableWidth = Math.max(0, hostWidth - gutter);
  const availableHeight = Math.max(0, hostHeight);
  const safeCanvasWidth = canvasWidth > 0 ? canvasWidth : 1;
  const safeDesignHeight = designCanvasHeight > 0 ? designCanvasHeight : 1;
  const safeContentHeight = Math.max(contentCanvasHeight, safeDesignHeight);
  const scaleX = availableWidth / safeCanvasWidth;
  const scaleY = availableHeight / safeDesignHeight;
  const scale = scaleMode === "component" ? Math.min(scaleX, scaleY) : scaleX;
  const scaledWidth = safeCanvasWidth * scale;
  const scaledContentHeight = safeContentHeight * scale;
  const contentWidth = snapScaledContentWidth(scaledWidth, availableWidth, scaleMode);

  if (scaleMode === "component") {
    return {
      scale,
      contentWidth,
      contentHeight: Math.ceil(scaledContentHeight),
      stageLeft: 0,
      centerContent: contentWidth < availableWidth - 0.5,
    };
  }

  const contentHeight =
    scaledContentHeight <= availableHeight + 0.5 ? availableHeight : Math.ceil(scaledContentHeight);
  return {
    scale,
    contentWidth: gutter + contentWidth,
    contentHeight,
    stageLeft: gutter,
    centerContent: false,
  };
}

export function resolvePixelCanvasMeasureElement(host: HTMLElement): HTMLElement {
  let pixelHost: HTMLElement | null = host;
  while (pixelHost) {
    if (pixelHost.classList.contains("pixel-canvas-host")) {
      return pixelHost;
    }
    pixelHost = pixelHost.parentElement;
  }
  let node: HTMLElement | null = host.parentElement;
  while (node) {
    if (node.classList.contains("dashboard-canvas-surface")) {
      return node;
    }
    const style = getComputedStyle(node);
    if (
      style.overflow === "hidden" ||
      style.overflowX === "hidden" ||
      style.overflowY === "hidden"
    ) {
      if (node.clientWidth > 0 && node.clientHeight > 0) return node;
    }
    node = node.parentElement;
  }
  return host;
}

/** 侧栏工具条屏幕宽度（px），用于左右翻转判定 */
export const SHAPE_ACTION_RAIL_SCREEN_WIDTH = 36;
export const SHAPE_ACTION_RAIL_ICON_SCREEN_WIDTH = 18;
export const SHAPE_ACTION_RAIL_SCREEN_GAP = 8;
export const SHAPE_ACTION_MENU_SCREEN_WIDTH = 168;
export const SHAPE_ACTION_RAIL_BUTTON_COUNT = 3;

/** 选中 shape 抬升 z-index，使外伸操作条不被邻组件遮盖 */
export const PIXEL_SHAPE_SELECTED_Z_BOOST = 1_000_000;

/** 对齐参考线须盖过选中 shape，否则拖动时蓝线被活动组件遮住 */
export const PIXEL_MARK_LINE_Z_INDEX = PIXEL_SHAPE_SELECTED_Z_BOOST + 1_000_000;

export function pixelShapeZIndex(order: number, selected: boolean): number {
  return selected ? PIXEL_SHAPE_SELECTED_Z_BOOST + order : order;
}

export type ShapeActionRailPlacement = "left" | "right";

/** @deprecated 不再使用 overlay */
export type ShapeActionRailPlacementLegacy = ShapeActionRailPlacement | "overlay";

function shapeActionRailRect(
  widget: Pick<PixelRect, "x" | "y" | "width" | "height">,
  side: "left" | "right",
  scale: number,
): PixelRect {
  const safeScale = scale > 0 ? scale : 1;
  const railPx = SHAPE_ACTION_RAIL_SCREEN_WIDTH / safeScale;
  const gapPx = SHAPE_ACTION_RAIL_SCREEN_GAP / safeScale;
  const height = railPx * SHAPE_ACTION_RAIL_BUTTON_COUNT;
  if (side === "right") {
    return {
      x: widget.x + widget.width + gapPx,
      y: widget.y,
      width: railPx,
      height,
    };
  }
  return {
    x: widget.x - gapPx - railPx,
    y: widget.y,
    width: railPx,
    height,
  };
}

function pixelRectsOverlap(a: PixelRect, b: PixelRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** 根据视口空间决定操作条在左/右；不叠放在本组件内容上，可覆盖未选中的邻组件 */
export function resolveShapeActionRailPlacement(
  widget: Pick<PixelRect, "x" | "y" | "width" | "height">,
  viewport: Pick<PixelRect, "x" | "width">,
  scale: number,
  others: Array<Pick<PixelRect, "x" | "y" | "width" | "height">> = [],
): ShapeActionRailPlacement {
  const safeScale = scale > 0 ? scale : 1;
  const railCanvas = (SHAPE_ACTION_RAIL_SCREEN_WIDTH + SHAPE_ACTION_RAIL_SCREEN_GAP) / safeScale;
  const menuCanvas = SHAPE_ACTION_MENU_SCREEN_WIDTH / safeScale;
  const rightEdge = widget.x + widget.width;
  const viewportRight = viewport.x + viewport.width;

  const fitsViewport = (side: "left" | "right") => {
    if (side === "right") return rightEdge + railCanvas + menuCanvas <= viewportRight + 0.5;
    return widget.x - railCanvas - menuCanvas >= viewport.x - 0.5;
  };

  const collides = (side: "left" | "right") =>
    others.some((other) => pixelRectsOverlap(shapeActionRailRect(widget, side, scale), other));

  if (fitsViewport("right") && !collides("right")) return "right";
  if (fitsViewport("left") && !collides("left")) return "left";

  // 邻组件碰撞时仍外置，靠选中 shape 的 z-index 浮在邻组件之上（不遮挡本组件内容）
  if (fitsViewport("right")) return "right";
  if (fitsViewport("left")) return "left";

  const spaceRight = viewportRight - rightEdge;
  const spaceLeft = widget.x - viewport.x;
  return spaceRight >= spaceLeft ? "right" : "left";
}

/** @deprecated 使用 resolveShapeActionRailPlacement */
export function resolveShapeActionRailSide(
  widget: Pick<PixelRect, "x" | "y" | "width" | "height">,
  viewport: Pick<PixelRect, "x" | "width">,
  scale: number,
  others: Array<Pick<PixelRect, "x" | "y" | "width" | "height">> = [],
): "left" | "right" {
  return resolveShapeActionRailPlacement(widget, viewport, scale, others);
}

export function clientPointToCanvas(
  host: Pick<HTMLElement, "getBoundingClientRect" | "scrollLeft" | "scrollTop">,
  clientX: number,
  clientY: number,
  scale: number,
  gutter = 0,
): PixelPoint {
  const safeScale = scale > 0 ? scale : 1;
  const rect = host.getBoundingClientRect();
  return {
    x: (clientX - rect.left + host.scrollLeft - gutter) / safeScale,
    y: (clientY - rect.top + host.scrollTop) / safeScale,
  };
}

export type PixelInteractionOptions = {
  allowBottomGrowth?: boolean;
};

export function applyPixelInteraction(
  start: PixelRect,
  delta: PixelPoint,
  kind: PixelInteractionKind,
  canvas: PixelCanvasBounds,
  options: PixelInteractionOptions = {},
): PixelRect {
  const allowBottomGrowth = options.allowBottomGrowth ?? false;
  if (kind === "move") {
    const maxY = allowBottomGrowth
      ? Number.POSITIVE_INFINITY
      : Math.max(0, canvas.height - start.height);
    return roundedRect(
      clamp(start.x + delta.x, 0, Math.max(0, canvas.width - start.width)),
      clamp(start.y + delta.y, 0, maxY),
      start.width,
      start.height,
    );
  }

  const movesLeft = kind.includes("w");
  const movesRight = kind.includes("e");
  const movesTop = kind.includes("n");
  const movesBottom = kind.includes("s");
  const startRight = start.x + start.width;
  const startBottom = start.y + start.height;
  const left = movesLeft
    ? clamp(start.x + delta.x, 0, startRight - MIN_WIDTH)
    : start.x;
  const right = movesRight
    ? clamp(startRight + delta.x, start.x + MIN_WIDTH, canvas.width)
    : startRight;
  const top = movesTop
    ? clamp(start.y + delta.y, 0, startBottom - MIN_HEIGHT)
    : start.y;
  const bottomLimit = allowBottomGrowth ? Number.POSITIVE_INFINITY : canvas.height;
  const bottom = movesBottom
    ? clamp(startBottom + delta.y, start.y + MIN_HEIGHT, bottomLimit)
    : startBottom;

  return roundedRect(left, top, right - left, bottom - top);
}
