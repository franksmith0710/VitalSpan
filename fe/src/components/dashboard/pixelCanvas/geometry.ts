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

export function applyPixelInteraction(
  start: PixelRect,
  delta: PixelPoint,
  kind: PixelInteractionKind,
  canvas: PixelCanvasBounds,
): PixelRect {
  if (kind === "move") {
    return roundedRect(
      clamp(start.x + delta.x, 0, Math.max(0, canvas.width - start.width)),
      clamp(start.y + delta.y, 0, Math.max(0, canvas.height - start.height)),
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
  const bottom = movesBottom
    ? clamp(startBottom + delta.y, start.y + MIN_HEIGHT, canvas.height)
    : startBottom;

  return roundedRect(left, top, right - left, bottom - top);
}
