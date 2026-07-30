import type { CSSProperties } from "react";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";

/** 分享/嵌入配置页区块 Card（与详情页 `rounded-2xl shadow-theme-sm` 一致） */
export const SHARE_SECTION_CARD_CLASS =
  "overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800";

export const SHARE_SECTION_CARD_HEADER_CLASS =
  "border-b border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]";

/** 分享页 fill 布局：主区 + 侧栏操作列 */
export const SHARE_FILL_BODY_CLASS = "flex min-h-0 flex-1 flex-col gap-3";

export const SHARE_FILL_GRID_CLASS =
  "grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,22rem)]";

export const SHARE_FILL_CARD_CLASS = "flex min-h-0 flex-col overflow-hidden";

export const SHARE_FILL_CARD_BODY_CLASS = "flex min-h-0 flex-1 flex-col overflow-hidden pt-4";

export const SHARE_FILL_SIDE_STACK_CLASS =
  "custom-scrollbar flex min-h-0 flex-col gap-3 overflow-y-auto";

/** 与 `DatasourceDetailPage` DetailSkeleton 同高 */
export const SHARE_PAGE_SKELETON_CLASS = "h-[520px] w-full rounded-xl";

const DEFAULT_SCREEN_ASPECT = "16 / 9";

/** 预览容器比例跟画布，避免 fit 模式多余 letterbox */
export function screenPreviewContainerStyle(layout: DashboardLayout): CSSProperties {
  if (layout.version === 2 && layout.canvas.width > 0 && layout.canvas.height > 0) {
    return { aspectRatio: `${layout.canvas.width} / ${layout.canvas.height}` };
  }
  return { aspectRatio: DEFAULT_SCREEN_ASPECT };
}
