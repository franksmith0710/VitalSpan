import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { D3CartesianRenderConfig, D3CartesianDatum } from "@/components/charts/engine/d3/types";
import { resolveChartSeriesColorItems } from "@/lib/chartSeriesColor";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import { readChartConditionalRules, readChartMarkLines } from "@/lib/chartDeFeatures";

export function extractDrillValue(datum: D3CartesianDatum, xField: string): string {
  const value = datum[xField] ?? datum.__category__;
  return value != null && String(value) !== "" ? String(value) : "";
}

export function buildCartesianRenderConfig(
  props: ChartEngineViewProps,
  plan: ChartRenderPlan,
  chartWidth: number,
  chartHeight: number,
): D3CartesianRenderConfig | null {
  if (plan.kind !== "d3" || plan.empty) return null;
  const { style, chartConfig, onInteraction, onJumpClick, isDark } = props;
  const options = plan.options;

  const xField = String(options.xField ?? "__category__");
  const yField = String(options.yField ?? "__value__");
  const seriesField = options.seriesField ? String(options.seriesField) : undefined;
  const data = (options.data as D3CartesianDatum[]) ?? [];

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

  const conditionalFromPlan = options.__conditionalRules as D3CartesianRenderConfig["conditionalRules"];
  const markLinesFromPlan = options.__markLines as D3CartesianRenderConfig["markLines"];

  return {
    width: Math.max(0, chartWidth),
    height: Math.max(0, chartHeight),
    data,
    xField,
    yField,
    seriesField,
    smooth: Boolean(options.smooth),
    isHorizontal: Boolean(options.isHorizontal),
    isStack: Boolean(options.isStack),
    isGroup: Boolean(options.isGroup),
    isPercent: Boolean(options.isPercent),
    area: options.area as boolean | Record<string, unknown> | undefined,
    colors,
    theme: getAntvThemeTokens(isDark ? "dark" : style.scheme),
    showLabel: style.showLabel,
    showTooltip: style.showTooltip,
    showLegend: !style.shellLegend && style.deStyle.legend?.show !== false && Boolean(seriesField),
    labelFontSize: style.labelPresentation.fontSize,
    valueFormat: style.valueFormat,
    markLines: chartConfig ? readChartMarkLines(chartConfig) : markLinesFromPlan ?? style.deFeatures?.markLines,
    conditionalRules:
      chartConfig ? readChartConditionalRules(chartConfig) : conditionalFromPlan ?? style.deFeatures?.conditionalRules,
    dataZoom: Boolean(options.__dataZoom),
    onPointClick:
      onInteraction || onJumpClick
        ? (datum) => {
            if (onJumpClick) {
              onJumpClick();
              return;
            }
            const value = extractDrillValue(datum, xField);
            if (value) onInteraction?.({ kind: "drill", value, label: value });
          }
        : undefined,
  };
}

export function d3CartesianTestId(chartType: string, plotType: string): string {
  if (chartType === "line" || plotType === "Line") return "d3-line-chart";
  if (chartType.startsWith("area")) return "d3-area-chart";
  return "d3-bar-chart";
}
