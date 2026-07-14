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
};

export function scaledCanvasMetrics(
  hostWidth: number,
  hostHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  gutter = 0,
  scaleMode: "canvas" | "component" = "canvas",
): ScaledCanvasMetrics {
  const availableWidth = Math.max(0, hostWidth - gutter);
  const availableHeight = Math.max(0, hostHeight);
  const safeCanvasWidth = canvasWidth > 0 ? canvasWidth : 1;
  const safeCanvasHeight = canvasHeight > 0 ? canvasHeight : 1;
  const scaleX = availableWidth / safeCanvasWidth;
  const scaleY = availableHeight / safeCanvasHeight;
  const scale = scaleMode === "component" ? Math.min(scaleX, scaleY) : scaleX;
  const scaledHeight = safeCanvasHeight * scale;
  const contentHeight =
    scaleMode === "component"
      ? Math.ceil(scaledHeight)
      : scaledHeight <= availableHeight + 0.5
        ? availableHeight
        : Math.ceil(scaledHeight);
  return {
    scale,
    contentWidth: gutter + availableWidth,
    contentHeight,
  };
}

export function resolvePixelCanvasMeasureElement(host: HTMLElement): HTMLElement {
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
export const SHAPE_ACTION_RAIL_SCREEN_WIDTH = 32;
export const SHAPE_ACTION_RAIL_SCREEN_GAP = 8;
export const SHAPE_ACTION_MENU_SCREEN_WIDTH = 168;

/** 根据组件在可视区域内的位置，决定 DE 风格操作条在左侧或右侧 */
export function resolveShapeActionRailSide(
  widget: Pick<PixelRect, "x" | "width">,
  viewport: Pick<PixelRect, "x" | "width">,
  scale: number,
): "left" | "right" {
  const safeScale = scale > 0 ? scale : 1;
  const railCanvas = (SHAPE_ACTION_RAIL_SCREEN_WIDTH + SHAPE_ACTION_RAIL_SCREEN_GAP) / safeScale;
  const menuCanvas = SHAPE_ACTION_MENU_SCREEN_WIDTH / safeScale;
  const rightEdge = widget.x + widget.width;
  const viewportRight = viewport.x + viewport.width;

  if (rightEdge + railCanvas + menuCanvas <= viewportRight + 0.5) return "right";
  if (widget.x - railCanvas - menuCanvas >= viewport.x - 0.5) return "left";

  const spaceRight = viewportRight - rightEdge;
  const spaceLeft = widget.x - viewport.x;
  return spaceRight >= spaceLeft ? "right" : "left";
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
