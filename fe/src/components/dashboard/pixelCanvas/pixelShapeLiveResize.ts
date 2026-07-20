export const PIXEL_SHAPE_LIVE_RESIZE = "pixel-shape-live-resize";
export const PIXEL_LAYOUT_GEOMETRY_COMMITTED = "pixel-layout-geometry-committed";

export function dispatchPixelShapeLiveResize() {
  document.dispatchEvent(new CustomEvent(PIXEL_SHAPE_LIVE_RESIZE));
}

/** 像素布局几何已提交（松手/取消）；嵌入图表应强制补测尺寸 */
export function dispatchPixelLayoutGeometryCommitted() {
  document.dispatchEvent(new CustomEvent(PIXEL_LAYOUT_GEOMETRY_COMMITTED));
}
