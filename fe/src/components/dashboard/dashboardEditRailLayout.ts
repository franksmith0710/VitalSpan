/** DataEase chart-edit 单列宽（配置 / 数据集），双列各一半 */
export const DASHBOARD_EDIT_RAIL_COLUMN_CLASS = "w-[216px]";

/** 右栏外壳固定总宽，仪表板配置与图表双列编辑同宽，避免切换时画布横向跳动 */
export const DASHBOARD_EDIT_RAIL_SHELL_CLASS =
  "w-[432px] max-w-[min(100%,432px)] shrink-0";

/** 单列组件配置（图片 / 页签 / 筛选等） */
export const DASHBOARD_EDIT_RAIL_NARROW_SHELL_CLASS =
  "w-[216px] max-w-[min(100%,216px)] shrink-0";

/**
 * 看板编辑右栏滚动。
 * - 壳层 `…-clip` 裁剪；`…-scroll` 供仪表板配置等长内容整体滚动
 * - 图表编辑（ChartInspectorTabs scrollMode=panel）占满高度，仅在 Tab 内容区滚动
 */
export const DASHBOARD_EDIT_RAIL_SCROLL_CLIP_CLASS =
  "dashboard-edit-rail-scroll-clip h-0 min-h-0 flex-1 overflow-hidden px-2 py-1";

export const DASHBOARD_EDIT_RAIL_SCROLL_CLASS =
  "dashboard-edit-rail-scroll h-full overflow-x-hidden overflow-y-auto overscroll-y-contain";

/** @deprecated 滚动已上移至 {@link DASHBOARD_EDIT_RAIL_SCROLL_CLASS}；保留别名避免遗漏引用 */
export const DASHBOARD_CONFIG_RAIL_SCROLL_CLASS = DASHBOARD_EDIT_RAIL_SCROLL_CLASS;

export const DASHBOARD_CONFIG_RAIL_CONTENT_CLASS = "w-full";
