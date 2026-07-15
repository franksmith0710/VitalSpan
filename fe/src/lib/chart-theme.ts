import type { ApexOptions } from "apexcharts";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import { getDashboardThemeTokens } from "@/components/dashboard/dashboardThemeTokens";
import { deepMergeOptions } from "./merge-options";

export const chartPalette = {
  brand: "#465fff", // @design-token-ok
  purple: "#7a5af8", // @design-token-ok
  success: "#12b76a", // @design-token-ok
  info: "#0ba5ec", // @design-token-ok
  pink: "#ee46bc", // @design-token-ok
} as const;

export const chartColors = Object.values(chartPalette);

export const CHART_PALETTE_PRESETS = {
  default: [...chartColors],
  tech: ["#465fff", "#0ba5ec", "#12b76a", "#7a5af8", "#ee46bc"],
  business: ["#344054", "#475467", "#667085", "#98a2b3", "#d0d5dd"],
  warm: ["#f79009", "#f04438", "#f63d68", "#ee46bc", "#fdb022"],
} as const;

export type ChartPaletteId = keyof typeof CHART_PALETTE_PRESETS;

export function resolveChartColors(
  paletteId?: string,
  custom?: string[],
): string[] {
  if (custom?.length) return custom;
  if (paletteId && paletteId in CHART_PALETTE_PRESETS) {
    return [...CHART_PALETTE_PRESETS[paletteId as ChartPaletteId]];
  }
  return [...chartColors];
}

export const chartFontFamily = "Outfit, sans-serif";

export const chartAxisLabelStyle = {
  colors: "#667085", // @design-token-ok
  fontSize: "12px",
} as const;

export const chartGridBorderColor = "#e4e7ec"; // @design-token-ok

const baseChartOptions: ApexOptions = {
  colors: chartColors,
  chart: {
    fontFamily: chartFontFamily,
    toolbar: { show: false },
    animations: {
      enabled: true,
      speed: 450,
      animateGradually: { enabled: true, delay: 80 },
      dynamicAnimation: { enabled: true, speed: 300 },
    },
  },
  dataLabels: { enabled: false },
  grid: {
    borderColor: chartGridBorderColor,
    strokeDashArray: 0,
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    labels: { style: chartAxisLabelStyle },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: chartAxisLabelStyle },
  },
  legend: {
    fontFamily: chartFontFamily,
    labels: { colors: "#344054" }, // @design-token-ok
  },
  stroke: {
    show: true,
    width: 4,
  },
  markers: {
    size: 0,
    strokeColors: "#fff", // @design-token-ok
    strokeWidth: 2,
    hover: { size: 6 },
  },
  states: {
    hover: { filter: { type: "lighten", value: 0.04 } },
    active: {
      allowMultipleDataPointsSelection: false,
      filter: { type: "darken", value: 0.08 },
    },
  } as NonNullable<ApexOptions["states"]>,
  tooltip: {
    enabled: true,
    theme: "light",
    shared: true,
    intersect: false,
  },
};

export function getBaseChartOptions(overrides?: ApexOptions): ApexOptions {
  return deepMergeOptions(
    baseChartOptions as Record<string, unknown>,
    overrides as Record<string, unknown> | undefined,
  ) as ApexOptions;
}


/** 看板图表坐标轴/图例/tooltip：随 colorScheme 固定两套配色 */
export function getApexThemeOverrides(scheme: ColorScheme): ApexOptions {
  const tokens = getDashboardThemeTokens(scheme);
  const isDark = scheme === "dark";
  const labelStyle = { colors: tokens.chartAxis, fontSize: "12px" } as const;
  return {
    theme: { mode: isDark ? "dark" : "light" },
    chart: { foreColor: tokens.chartAxis, background: "transparent" },
    grid: { borderColor: tokens.chartGrid },
    xaxis: { labels: { style: labelStyle } },
    yaxis: { labels: { style: labelStyle } },
    legend: { labels: { colors: tokens.chartLegend } },
    tooltip: { theme: isDark ? "dark" : "light" },
  };
}

export const barChartPlotOptions: NonNullable<ApexOptions["plotOptions"]> = {
  bar: {
    horizontal: false,
    columnWidth: "39%",
    borderRadius: 5,
    borderRadiusApplication: "end",
  },
};

export const lineChartStrokeOptions: NonNullable<ApexOptions["stroke"]> = {
  curve: "smooth",
  width: 2,
};

export function createBarChartOptions(
  categories: string[],
  overrides?: ApexOptions,
): ApexOptions {
  return getBaseChartOptions({
    chart: { type: "bar" },
    plotOptions: barChartPlotOptions,
    xaxis: { categories },
    stroke: { colors: ["transparent"] },
    ...overrides,
  });
}

export function createLineChartOptions(
  categories: string[],
  overrides?: ApexOptions,
): ApexOptions {
  return getBaseChartOptions({
    chart: { type: "line" },
    stroke: lineChartStrokeOptions,
    xaxis: { categories },
    ...overrides,
  });
}
