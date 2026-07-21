/** DataEase chart-edit 双列总宽（与 {@link DASHBOARD_EDIT_RAIL_SHELL_CLASS} 一致） */
export const DASHBOARD_EDIT_RAIL_WIDTH_PX = 432;

/** 图表编辑左列：数据/样式/高级配置（略宽，便于字段槽与标签横排） */
export const DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS = "w-[252px]";

/** 图表编辑右列：数据集与字段库（略窄，总宽不变） */
export const DASHBOARD_EDIT_RAIL_RIGHT_COLUMN_CLASS = "w-[180px]";

/** @deprecated 使用 {@link DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS} / {@link DASHBOARD_EDIT_RAIL_RIGHT_COLUMN_CLASS} */
export const DASHBOARD_EDIT_RAIL_COLUMN_CLASS = DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS;

/** 右栏外壳固定总宽（仪表板配置 / 图表双列 / 页签·筛选·图片单列均同宽，避免切换时画布横向跳动） */
export const DASHBOARD_EDIT_RAIL_SHELL_CLASS =
  "w-[432px] max-w-[min(100%,432px)] shrink-0";

/** @deprecated 右栏已统一为 {@link DASHBOARD_EDIT_RAIL_SHELL_CLASS} */
export const DASHBOARD_EDIT_RAIL_NARROW_SHELL_CLASS = DASHBOARD_EDIT_RAIL_SHELL_CLASS;

/**
 * 看板编辑右栏滚动。
 * - 壳层 `…-clip` 裁剪；`…-scroll` 供仪表板配置等长内容整体滚动
 * - 组件右栏（页签/图片/图表等）在 ChartInspectorTabs 面板内滚动（scrollMode=panel）
 */
export const DASHBOARD_EDIT_RAIL_SCROLL_CLIP_CLASS =
  "dashboard-edit-rail-scroll-clip h-0 min-h-0 flex-1 overflow-hidden px-2 py-1";

export const DASHBOARD_EDIT_RAIL_SCROLL_CLASS =
  "dashboard-edit-rail-scroll h-full overflow-x-hidden overflow-y-auto overscroll-y-contain";

/** @deprecated 滚动已上移至 {@link DASHBOARD_EDIT_RAIL_SCROLL_CLASS}；保留别名避免遗漏引用 */
export const DASHBOARD_CONFIG_RAIL_SCROLL_CLASS = DASHBOARD_EDIT_RAIL_SCROLL_CLASS;

export const DASHBOARD_CONFIG_RAIL_CONTENT_CLASS = "w-full";
