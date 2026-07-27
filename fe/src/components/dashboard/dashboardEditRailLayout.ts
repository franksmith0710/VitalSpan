/** DataEase chart-edit 双列总宽（与 {@link DASHBOARD_EDIT_RAIL_SHELL_CLASS} 一致） */
export const DASHBOARD_EDIT_RAIL_WIDTH_PX = 432;

/** 图表编辑左列：数据/样式/高级配置（252fr，随壳层内边距收缩） */
export const DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS = "min-w-0 flex-[252] basis-0";

/** 图表编辑右列：数据集与字段库（180fr，随壳层内边距收缩） */
export const DASHBOARD_EDIT_RAIL_RIGHT_COLUMN_CLASS = "min-w-0 flex-[180] basis-0";

/** @deprecated 使用 {@link DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS} / {@link DASHBOARD_EDIT_RAIL_RIGHT_COLUMN_CLASS} */
export const DASHBOARD_EDIT_RAIL_COLUMN_CLASS = DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS;

/** 右栏外壳固定总宽（仪表板配置 / 图表双列 / 页签·筛选·图片单列均同宽，避免切换时画布横向跳动） */
export const DASHBOARD_EDIT_RAIL_SHELL_CLASS =
  "w-[432px] max-w-[min(100%,432px)] shrink-0";

/** @deprecated 右栏已统一为 {@link DASHBOARD_EDIT_RAIL_SHELL_CLASS} */
export const DASHBOARD_EDIT_RAIL_NARROW_SHELL_CLASS = DASHBOARD_EDIT_RAIL_SHELL_CLASS;

/**
 * 看板编辑右栏滚动。
 * - 壳层 `…-clip` 裁剪；`…-pass-through` 仅透传高度，由子级（ChartInspectorTabs 等）内部滚动
 * - `…-scroll` 供仪表板配置等长内容整体滚动
 */
export const DASHBOARD_EDIT_RAIL_SCROLL_CLIP_CLASS =
  "dashboard-edit-rail-scroll-clip h-0 min-h-0 flex-1 overflow-hidden px-2 py-1";

/** 高度透传：子级 flex 链获得固定高度后在面板内滚动 */
export const DASHBOARD_EDIT_RAIL_PASS_THROUGH_CLASS =
  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden";

export const DASHBOARD_EDIT_RAIL_SCROLL_CLASS =
  "dashboard-edit-rail-scroll h-full min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain";

/** @deprecated 滚动已上移至 {@link DASHBOARD_EDIT_RAIL_SCROLL_CLASS}；保留别名避免遗漏引用 */
export const DASHBOARD_CONFIG_RAIL_SCROLL_CLASS = DASHBOARD_EDIT_RAIL_SCROLL_CLASS;

export const DASHBOARD_CONFIG_RAIL_CONTENT_CLASS = "w-full";
