export const CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX = 8;

/** 编辑视口留白：画布四向可扩展，右下为主工作区方向 */
export const DATA_SCREEN_EDIT_PAN_PADDING_MIN_PX = 480;

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

/** 编辑视口留白尺寸（与画布缩放尺寸、视口尺寸取较大值） */
export function resolveDataScreenEditPanPadding(
  viewport: ViewportSize,
  content: Pick<ContentLayout, "scaledWidth" | "scaledHeight">,
): { padX: number; padY: number } {
  return {
    padX: Math.max(
      DATA_SCREEN_EDIT_PAN_PADDING_MIN_PX,
      viewport.width,
      Math.round(content.scaledWidth * 0.5),
    ),
    padY: Math.max(
      DATA_SCREEN_EDIT_PAN_PADDING_MIN_PX,
      viewport.height,
      Math.round(content.scaledHeight * 0.5),
    ),
  };
}

/** 平移上下界：pan 即画布位移；左上为 0，向左/上可浏览溢出内容，向右/下可进入工作区留白。 */
export function computeViewportPanBounds(
  viewport: ViewportSize,
  content: ContentLayout,
): ViewportPanBounds {
  const { padX, padY } = resolveDataScreenEditPanPadding(viewport, content);
  const overflowX = Math.max(0, content.scaledWidth - viewport.width);
  const overflowY = Math.max(0, content.scaledHeight - viewport.height);
  return {
    minPanX: -(overflowX + padX),
    maxPanX: padX,
    minPanY: -(overflowY + padY),
    maxPanY: padY,
  };
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
  const scrollOffset = Math.min(maxScroll, Math.max(0, pan - minPan));
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
  return bounds.minPanX + scrollOffset;
}

export function panFromVerticalScroll(
  scrollOffset: number,
  bounds: ViewportPanBounds,
): number {
  return bounds.minPanY + scrollOffset;
}
