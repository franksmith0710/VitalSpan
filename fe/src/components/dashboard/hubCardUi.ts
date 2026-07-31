import type { CSSProperties } from "react";

/** 看板 / 大屏 / 模板 / 组件库 Hub 卡片统一预览比例 */
export const HUB_CARD_ASPECT_RATIO = "16 / 10";

/** @deprecated 使用 HUB_CARD_ASPECT_RATIO */
export const DASHBOARD_LIST_CARD_ASPECT_RATIO = HUB_CARD_ASPECT_RATIO;

export const HUB_CARD_SHELL_CLASS =
  "group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs transition hover:border-brand-200 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/30";

export const HUB_CARD_PREVIEW_FRAME_CLASS =
  "relative overflow-hidden border-b border-gray-100 dark:border-white/[0.06]";

export const HUB_CARD_BODY_CLASS = "flex flex-col gap-2 p-3";

export function hubCardPreviewFrameStyle(): CSSProperties {
  return { aspectRatio: HUB_CARD_ASPECT_RATIO };
}

export const HUB_CARD_SKELETON_PREVIEW_CLASS = "aspect-[16/10] animate-pulse bg-gray-100 dark:bg-white/[0.04]";

export const HUB_CARD_SKELETON_BODY_CLASS = "space-y-2 p-3";
