export const CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX = 8;

export type ViewportPan = { x: number; y: number };

export type ViewportPanBounds = {
  minPanX: number;
  maxPanX: number;
  minPanY: number;
  maxPanY: number;
};

export type ViewportScrollAxisMetrics = {
  scrollSize: number;
  clientSize: number;
  scrollOffset: number;
  canScroll: boolean;
};

export type ViewportScrollMetrics = {
  bounds: ViewportPanBounds;
  horizontal: ViewportScrollAxisMetrics;
  vertical: ViewportScrollAxisMetrics;
};

type ViewportSize = { width: number; height: number };
type ContentLayout = {
  scaledWidth: number;
  scaledHeight: number;
  offsetX: number;
  offsetY: number;
};

/** 平移上下界：保证画布在视口内可浏览（含留白时的有限滑动）。 */
export function computeViewportPanBounds(
  viewport: ViewportSize,
  content: ContentLayout,
): ViewportPanBounds {
  const minPanX = viewport.width - content.scaledWidth - content.offsetX;
  const maxPanX = content.offsetX === 0 ? 0 : -content.offsetX;
  const minPanY = viewport.height - content.scaledHeight - content.offsetY;
  const maxPanY = content.offsetY === 0 ? 0 : -content.offsetY;
  return { minPanX, maxPanX, minPanY, maxPanY };
}

export function clampViewportPan(pan: ViewportPan, bounds: ViewportPanBounds): ViewportPan {
  const minX = Math.min(bounds.minPanX, bounds.maxPanX);
  const maxX = Math.max(bounds.minPanX, bounds.maxPanX);
  const minY = Math.min(bounds.minPanY, bounds.maxPanY);
  const maxY = Math.max(bounds.minPanY, bounds.maxPanY);
  return {
    x: Math.min(maxX, Math.max(minX, pan.x)),
    y: Math.min(maxY, Math.max(minY, pan.y)),
  };
}

function axisScrollMetrics(
  clientSize: number,
  minPan: number,
  maxPan: number,
  pan: number,
): ViewportScrollAxisMetrics {
  const scrollSize = Math.max(clientSize, maxPan - minPan + clientSize);
  const maxScroll = Math.max(0, scrollSize - clientSize);
  const scrollOffset = Math.min(maxScroll, Math.max(0, maxPan - pan));
  return {
    scrollSize,
    clientSize,
    scrollOffset,
    canScroll: maxScroll > 0.5,
  };
}

export function computeViewportScrollMetrics(
  viewport: ViewportSize,
  content: ContentLayout,
  pan: ViewportPan,
): ViewportScrollMetrics {
  const bounds = computeViewportPanBounds(viewport, content);
  return {
    bounds,
    horizontal: axisScrollMetrics(
      viewport.width,
      bounds.minPanX,
      bounds.maxPanX,
      pan.x,
    ),
    vertical: axisScrollMetrics(
      viewport.height,
      bounds.minPanY,
      bounds.maxPanY,
      pan.y,
    ),
  };
}

export function panFromHorizontalScroll(
  scrollOffset: number,
  bounds: ViewportPanBounds,
): number {
  return bounds.maxPanX - scrollOffset;
}

export function panFromVerticalScroll(
  scrollOffset: number,
  bounds: ViewportPanBounds,
): number {
  return bounds.maxPanY - scrollOffset;
}
