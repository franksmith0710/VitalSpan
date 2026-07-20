/** 对标 DataEase debounceRender（文档参考）；isPlayer 引擎 resize 在松手后触发 */
export const PIXEL_LIVE_RESIZE_DEBOUNCE_MS = 32;

export const PIXEL_SHAPE_LIVE_RESIZE = "pixel-shape-live-resize";
export const PIXEL_LAYOUT_GEOMETRY_COMMITTED = "pixel-layout-geometry-committed";

export function dispatchPixelShapeLiveResize() {
  document.dispatchEvent(new CustomEvent(PIXEL_SHAPE_LIVE_RESIZE));
}

/** 像素布局几何已提交（松手/取消）；嵌入图表应强制补测尺寸 */
export function dispatchPixelLayoutGeometryCommitted() {
  document.dispatchEvent(new CustomEvent(PIXEL_LAYOUT_GEOMETRY_COMMITTED));
}
