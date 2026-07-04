import { chartPalette, chartAxisLabelStyle } from "./chart-theme";

export function getEchartsTheme(isDark: boolean): Record<string, unknown> {
  const labelColor = isDark ? "#98a2b3" : chartAxisLabelStyle.colors; // @design-token-ok
  const axisLine = isDark ? "#344054" : "#e4e7ec"; // @design-token-ok
  return {
    color: [
      chartPalette.brand,
      chartPalette.purple,
      chartPalette.success,
      chartPalette.info,
      chartPalette.pink,
    ],
    backgroundColor: "transparent",
    textStyle: { color: labelColor, fontFamily: "Outfit, sans-serif" },
    categoryAxis: {
      axisLine: { lineStyle: { color: axisLine } },
      axisLabel: { color: labelColor },
      splitLine: { lineStyle: { color: axisLine } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: axisLine } },
      axisLabel: { color: labelColor },
      splitLine: { lineStyle: { color: axisLine } },
    },
  };
}
