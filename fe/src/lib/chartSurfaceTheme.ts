import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import { isDarkWidgetShellColor } from "@/components/dashboard/dashboardStyleConfig";
import { getDashboardThemeTokens } from "@/components/dashboard/dashboardThemeTokens";
import type { ChartDeTableStyle } from "./chartDeTableStyle";
import { DASHBOARD_SCROLL_CSS_VARS } from "./dashboardScrollTokens";

/** 看板滚动条令牌（浅/深主题统一，对标 DE 白色半透明） */
const SCROLL_VARS = DASHBOARD_SCROLL_CSS_VARS;

/** 组件实际底色优先于仪表板 colorScheme（对标 DE 组件内主题跟随） */
export function resolveEffectiveChartScheme(
  colorScheme: ColorScheme,
  widgetShellBg?: string,
): ColorScheme {
  const paint = widgetShellBg?.trim();
  if (!paint || paint.startsWith("var(")) return colorScheme;
  return isDarkWidgetShellColor(paint) ? "dark" : "light";
}

/** 明细表主题 CSS 变量：组件配色 > 有效主题令牌 */
export function resolveTableThemeVars(
  tableStyle: ChartDeTableStyle,
  context: { colorScheme: ColorScheme; widgetShellBg?: string },
): Record<string, string> {
  const scheme = resolveEffectiveChartScheme(context.colorScheme, context.widgetShellBg);
  const tokens = getDashboardThemeTokens(scheme);

  const vars: Record<string, string> = {
    "--dashboard-table-header-bg": tableStyle.headerBg ?? tokens.tableHeaderBg,
    "--dashboard-table-header-fg": tableStyle.headerFg ?? tokens.tableHeaderFg,
    "--dashboard-table-body-fg": tableStyle.bodyFg ?? tokens.tableBodyFg,
    "--dashboard-table-border": tableStyle.borderColor ?? tokens.tableBorder,
    ...SCROLL_VARS,
  };

  if (tableStyle.bodyBg) vars["--dashboard-table-body-bg"] = tableStyle.bodyBg;
  if (tableStyle.summaryBg) vars["--dashboard-table-summary-bg"] = tableStyle.summaryBg;
  if (tableStyle.summaryFg) vars["--dashboard-table-summary-fg"] = tableStyle.summaryFg;

  if (tableStyle.scrollbarColor) {
    vars["--dashboard-scroll-thumb"] = tableStyle.scrollbarColor;
    vars["--dashboard-scroll-thumb-hover"] = tableStyle.scrollbarColor;
  }

  return vars;
}
