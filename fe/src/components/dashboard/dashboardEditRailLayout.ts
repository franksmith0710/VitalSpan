/** DataEase chart-edit 单列宽（配置 / 数据集），双列各一半 */
export const DASHBOARD_EDIT_RAIL_COLUMN_CLASS = "w-[216px]";

/** 右栏外壳固定总宽，仪表板配置与图表双列编辑同宽，避免切换时画布横向跳动 */
export const DASHBOARD_EDIT_RAIL_SHELL_CLASS =
  "w-[432px] max-w-[min(100%,432px)] shrink-0";

/**
 * 看板编辑右栏**唯一**纵向滚动容器（壳层 header 下方）。
 * - 外层 `…-clip` 裁剪滚动条；内层 `…-scroll` 承担滚动
 * - 画布：`pixel-canvas-host.dashboard-scroll` 保留可见滚动条
 * - 子面板禁止再设 overflow-y-auto
 */
export const DASHBOARD_EDIT_RAIL_SCROLL_CLIP_CLASS =
  "dashboard-edit-rail-scroll-clip h-0 min-h-0 flex-1 overflow-hidden px-2 py-1";

export const DASHBOARD_EDIT_RAIL_SCROLL_CLASS =
  "dashboard-edit-rail-scroll h-full overflow-x-hidden overflow-y-auto overscroll-y-contain";

/** @deprecated 滚动已上移至 {@link DASHBOARD_EDIT_RAIL_SCROLL_CLASS}；保留别名避免遗漏引用 */
export const DASHBOARD_CONFIG_RAIL_SCROLL_CLASS = DASHBOARD_EDIT_RAIL_SCROLL_CLASS;

export const DASHBOARD_CONFIG_RAIL_CONTENT_CLASS = "w-full";
