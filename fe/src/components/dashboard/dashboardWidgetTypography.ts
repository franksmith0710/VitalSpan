/** 像素画布缩放后，屏幕上目标可读高度（px），对齐 text-theme-sm 行高密度 */
export const PIXEL_SCREEN_RAIL_HEIGHT_PX = 32;

/** 预览态 shape 壳层标题栏屏幕高度（px） */
export const PIXEL_SCREEN_TITLE_HEIGHT_PX = 36;

/** 像素画布拖动手柄逻辑高度（随 scale 反比放大，保证缩放后屏幕高度稳定） */
export function pixelDragRailHeightPx(canvasScale: number): number {
  const scale = canvasScale > 0 ? canvasScale : 1;
  return Math.ceil(PIXEL_SCREEN_RAIL_HEIGHT_PX / scale);
}

export function pixelViewTitleHeightPx(canvasScale: number): number {
  const scale = canvasScale > 0 ? canvasScale : 1;
  return Math.ceil(PIXEL_SCREEN_TITLE_HEIGHT_PX / scale);
}

/** 画布内组件状态/空态文案 */
export const dwState =
  "text-base leading-snug text-gray-500 dark:text-gray-400";
export const dwStateWarning =
  "text-base leading-snug text-warning-600 dark:text-warning-400";
export const dwStateError =
  "text-base leading-snug text-error-700 dark:text-error-400";

export const dwTitle =
  "text-base font-semibold leading-snug text-gray-800 dark:text-white/90";
export const dwCaption =
  "text-sm leading-snug text-gray-500 dark:text-gray-400";
export const dwMeta = "text-sm tabular-nums text-gray-400";

/** @deprecated 使用 pixelDragRailHeightPx(canvasScale) */
export const PIXEL_DRAG_RAIL_HEIGHT_PX = 40;
