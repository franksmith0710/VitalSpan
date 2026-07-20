import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { DashboardStyleConfig, NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import {
  readChartDeStyle,
  readChartDataZoom,
  readChartSeriesGradient,
  readChartShowLabel,
  readChartTooltipShow,
  resolveChartLabelPresentation,
  resolveChartTooltipPresentation,
} from "@/lib/chartDeStyle";
import { readChartDeFeatures } from "@/lib/chartDeFeatures";
import { resolveChartValueFormat } from "@/lib/chartValueFormat";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";

type BuildStyleContextInput = {
  config: ChartViewConfig;
  scheme: ColorScheme;
  chartColors: string[];
  dashboardDefaults?: Pick<
    DashboardStyleConfig,
    | "chartLabelShow"
    | "seriesGradient"
    | "tooltipShow"
    | "chartLabelStyle"
    | "chartTooltipStyle"
    | "surfaceKind"
  >;
  shellLegend?: boolean;
  embedEdit?: boolean;
  numberFormat?: NumberFormatConfig;
  widgetShellBg?: string;
};

export function buildStyleContext(input: BuildStyleContextInput): ChartStyleContext {
  const { config, scheme, chartColors, dashboardDefaults, shellLegend = false, embedEdit = false } =
    input;
  const deStyle = readChartDeStyle(config);
  const showLabel = readChartShowLabel(config, dashboardDefaults);
  const showTooltip = readChartTooltipShow(config, dashboardDefaults);
  const seriesGradient = readChartSeriesGradient(config, dashboardDefaults);
  const dataZoom = readChartDataZoom(config);
  const valueFormat = resolveChartValueFormat(deStyle.label, input.numberFormat);

  return {
    scheme,
    deStyle,
    deFeatures: readChartDeFeatures(config),
    chartColors,
    dataScreenSurface: dashboardDefaults?.surfaceKind === "data-screen",
    showLabel,
    showTooltip,
    seriesGradient,
    dataZoom,
    valueFormat,
    labelPresentation: resolveChartLabelPresentation(config, dashboardDefaults),
    tooltipPresentation: resolveChartTooltipPresentation(config, dashboardDefaults),
    shellLegend,
    embedEdit,
    widgetShellBg: input.widgetShellBg,
  };
}
