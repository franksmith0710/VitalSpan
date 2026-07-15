import type { EChartsOption } from "echarts";
import { chartPalette } from "./chartPalette";
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
    legend: {
      textStyle: { color: tokens.chartLegend },
      pageTextStyle: { color: tokens.chartAxis },
    },
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

function patchAxis(
  axis: EChartsOption["xAxis"],
  tokens: ReturnType<typeof getDashboardThemeTokens>,
): EChartsOption["xAxis"] {
  if (!axis) return axis;
  const patchOne = (item: Record<string, unknown>) => ({
    ...item,
    axisLabel: {
      ...(typeof item.axisLabel === "object" ? item.axisLabel : {}),
      color: tokens.chartAxis,
    },
    axisLine: {
      ...(typeof item.axisLine === "object" ? item.axisLine : {}),
      lineStyle: {
        ...(typeof (item.axisLine as { lineStyle?: object })?.lineStyle === "object"
          ? (item.axisLine as { lineStyle?: object }).lineStyle
          : {}),
        color: tokens.chartGrid,
      },
    },
    splitLine: {
      ...(typeof item.splitLine === "object" ? item.splitLine : {}),
      lineStyle: {
        ...(typeof (item.splitLine as { lineStyle?: object })?.lineStyle === "object"
          ? (item.splitLine as { lineStyle?: object }).lineStyle
          : {}),
        color: tokens.chartGrid,
      },
    },
  });
  if (Array.isArray(axis)) return axis.map((item) => patchOne(item as Record<string, unknown>));
  return patchOne(axis as Record<string, unknown>);
}

/** 将看板 colorScheme 令牌写入 ECharts option（图例/轴/饼图标签等） */
export function applyEchartsColorSchemeTokens(
  option: EChartsOption,
  scheme: ColorScheme = "light",
): EChartsOption {
  const tokens = getDashboardThemeTokens(scheme);
  const prevLegend =
    option.legend && typeof option.legend === "object" && !Array.isArray(option.legend)
      ? option.legend
      : {};

  let next: EChartsOption = {
    ...option,
    textStyle: {
      ...(typeof option.textStyle === "object" ? option.textStyle : {}),
      color: tokens.chartAxis,
    },
    legend: {
      ...prevLegend,
      textStyle: {
        ...(typeof prevLegend.textStyle === "object" ? prevLegend.textStyle : {}),
        color: tokens.chartLegend,
      },
      pageTextStyle: {
        ...(typeof prevLegend.pageTextStyle === "object" ? prevLegend.pageTextStyle : {}),
        color: tokens.chartAxis,
      },
    },
    xAxis: patchAxis(option.xAxis, tokens),
    yAxis: patchAxis(option.yAxis, tokens),
  };

  if (Array.isArray(next.series)) {
    next.series = next.series.map((series) => {
      if (!series || typeof series !== "object") return series;
      const typed = series as Record<string, unknown>;
      const type = typed.type as string | undefined;
      if (type !== "pie" && type !== "funnel") return series;
      return {
        ...typed,
        label: {
          ...(typeof typed.label === "object" ? typed.label : {}),
          color: tokens.chartAxis,
        },
        labelLine: {
          ...(typeof typed.labelLine === "object" ? typed.labelLine : {}),
          lineStyle: {
            ...(typeof (typed.labelLine as { lineStyle?: object })?.lineStyle === "object"
              ? (typed.labelLine as { lineStyle?: object }).lineStyle
              : {}),
            color: tokens.chartGrid,
          },
        },
      };
    });
  }

  return next;
}
