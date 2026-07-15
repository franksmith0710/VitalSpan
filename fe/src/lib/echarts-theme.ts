import { chartPalette } from "./chart-theme";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import { getDashboardThemeTokens } from "@/components/dashboard/dashboardThemeTokens";

export function getEchartsTheme(scheme: ColorScheme = "light"): Record<string, unknown> {
  const tokens = getDashboardThemeTokens(scheme);
  return {
    color: [
      chartPalette.brand,
      chartPalette.purple,
      chartPalette.success,
      chartPalette.info,
      chartPalette.pink,
    ],
    backgroundColor: "transparent",
    textStyle: { color: tokens.chartAxis, fontFamily: "Outfit, sans-serif" },
    categoryAxis: {
      axisLine: { lineStyle: { color: tokens.chartGrid } },
      axisLabel: { color: tokens.chartAxis },
      splitLine: { lineStyle: { color: tokens.chartGrid } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: tokens.chartGrid } },
      axisLabel: { color: tokens.chartAxis },
      splitLine: { lineStyle: { color: tokens.chartGrid } },
    },
  };
}
