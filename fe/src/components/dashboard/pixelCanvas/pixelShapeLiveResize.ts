export const PIXEL_SHAPE_LIVE_RESIZE = "pixel-shape-live-resize";

export function dispatchPixelShapeLiveResize() {
  document.dispatchEvent(new CustomEvent(PIXEL_SHAPE_LIVE_RESIZE));
}
