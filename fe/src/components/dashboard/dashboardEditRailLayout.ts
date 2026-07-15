/** DataEase chart-edit 单列宽（配置 / 数据集），双列各一半 */
export const DASHBOARD_EDIT_RAIL_COLUMN_CLASS = "w-[216px]";

/** 右栏外壳固定总宽，仪表板配置与图表双列编辑同宽，避免切换时画布横向跳动 */
export const DASHBOARD_EDIT_RAIL_SHELL_CLASS =
  "w-[432px] max-w-[min(100%,432px)] shrink-0";

/** 432px 看板配置轨：轻量贴边留白，内容全宽利用；隐藏滚动条避免与画布滚动条并排 */
export const DASHBOARD_CONFIG_RAIL_SCROLL_CLASS =
  "dashboard-config-rail no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1";

export const DASHBOARD_CONFIG_RAIL_CONTENT_CLASS = "w-full";
