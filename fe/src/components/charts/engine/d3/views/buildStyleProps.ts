import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { resolveChartSeriesColorItems } from "@/lib/chartSeriesColor";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import { readChartConditionalRules, readChartMarkLines } from "@/lib/chartDeFeatures";

export function buildD3StyleProps(props: ChartEngineViewProps, plan: ChartRenderPlan) {
  const { style, chartConfig, isDark } = props;
  const options = plan.options;

  const paletteItems =
    chartConfig && style.deFeatures?.conditionalRules?.length === 0
      ? resolveChartSeriesColorItems(
          chartConfig,
          style.deStyle.paletteId,
          readChartDeStyle(chartConfig).seriesColor ?? style.deStyle.seriesColor,
        )
      : [];
  const optionColors = Array.isArray(options.color) ? (options.color as string[]) : [];
  const colors =
    paletteItems.length > 0
      ? paletteItems.map((item) => item.color)
      : optionColors.length > 0
        ? optionColors
        : style.chartColors.length > 0
          ? style.chartColors
          : ["#465fff"];

  const conditionalFromPlan = options.__conditionalRules as ReturnType<typeof readChartConditionalRules>;
  const conditionalRules = chartConfig
    ? readChartConditionalRules(chartConfig)
    : conditionalFromPlan ?? style.deFeatures?.conditionalRules;
  const markLinesFromPlan = options.__markLines as ReturnType<typeof readChartMarkLines>;
  const markLines = chartConfig
    ? readChartMarkLines(chartConfig)
    : markLinesFromPlan ?? style.deFeatures?.markLines;

  return {
    colors,
    theme: getAntvThemeTokens(isDark ? "dark" : style.scheme),
    showLabel: style.showLabel,
    showTooltip: style.showTooltip,
    showLegend: !style.shellLegend && style.deStyle.legend?.show !== false,
    labelFontSize: style.labelPresentation.fontSize,
    valueFormat: style.valueFormat,
    conditionalRules,
    markLines,
  };
}
