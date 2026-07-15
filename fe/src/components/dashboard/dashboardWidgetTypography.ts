import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** 像素画布缩放后，操作条按钮屏幕边长（px） */
export const PIXEL_SCREEN_ACTION_RAIL_BTN_PX = 36;

/** 像素画布缩放后，操作条图标屏幕边长（px） */
export const PIXEL_SCREEN_ACTION_RAIL_ICON_PX = 18;

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
  "text-base leading-snug text-[var(--dashboard-state-text,#667085)]";
export const dwStateWarning =
  "text-base leading-snug text-warning-600 dark:text-warning-400";
export const dwStateError =
  "text-base leading-snug text-error-700 dark:text-error-400";

export const dwTitle =
  "text-theme-sm font-semibold leading-snug text-[var(--dashboard-title-color,#1d2939)] dark:text-white/90";

/** 像素画布 shape 顶栏标题（字号由 CSS 变量补偿，勿内联 fontSize） */
export const dwShapeTitle = cn(dwTitle, "min-w-0 flex-1 truncate");

export function shapeTitlePresentationStyle(style: CSSProperties): CSSProperties {
  const { fontSize: _fs, lineHeight: _lh, letterSpacing: _ls, ...rest } = style;
  return rest;
}
export const dwCaption =
  "text-sm leading-snug text-[var(--dashboard-text-muted,#667085)]";

/** 图表/地图底部提示、待配置说明等辅助文案 */
export const dwHint =
  "text-sm leading-snug text-[var(--dashboard-text-muted,#667085)]";

/** 看板内嵌表格单元格 */
export const dwTableCell = "px-2.5 py-1.5 text-theme-sm tabular-nums";

/** 表格分页、页码等元信息 */
export const dwTableMeta =
  "text-theme-sm tabular-nums text-[var(--dashboard-text-muted,#667085)]";

export const dwMeta = "text-sm tabular-nums text-[var(--dashboard-text-muted,#667085)]";

/** @deprecated 使用 pixelDragRailHeightPx(canvasScale) */
export const PIXEL_DRAG_RAIL_HEIGHT_PX = 40;
