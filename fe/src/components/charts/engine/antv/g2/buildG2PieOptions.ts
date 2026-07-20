import type { ChartStyleContext } from "@/components/charts/engine/types";
import type { AntvPieRow } from "@/components/charts/engine/antv/spec/encodePie";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import {
  readChartLegendPosition,
  readChartPieStyle,
  type ChartDeStyle,
} from "@/lib/chartDeStyle";
import { readChartLegendOrient } from "@/lib/chartLegendPresentation";
import type { ChartConditionalRule } from "@/lib/chartDeFeatures";

export const G2_PIE_HOVER_SCALE = 1.12;
export const G2_PIE_OUTER_RADIUS = 0.8;

export type G2PieSegmentRow = AntvPieRow & { segmentColor: string };

export type G2PieRenderConfig = {
  data: G2PieSegmentRow[];
  innerRadius: number;
  outerRadius: number;
  isRose: boolean;
  showLabel: boolean;
  showTooltip: boolean;
  showLegend: boolean;
  legendPosition: "top" | "bottom" | "left" | "right";
  labelFill: string;
  labelFontSize: number;
  hoverScale: number;
};

function matchConditionalRule(value: number, rule: ChartConditionalRule): boolean {
  switch (rule.operator) {
    case "gt":
      return value > rule.value;
    case "gte":
      return value >= rule.value;
    case "lt":
      return value < rule.value;
    case "lte":
      return value <= rule.value;
    default:
      return value === rule.value;
  }
}

function mapLegendPosition(
  pos: string | undefined,
  orient: string,
): "top" | "bottom" | "left" | "right" {
  if (pos === "left" || pos === "right" || pos === "bottom" || pos === "top") return pos;
  if (orient === "vertical") return "right";
  return "top";
}

export function isRosePieChartType(chartType: string): boolean {
  return chartType === "pie-rose" || chartType === "pie-donut-rose";
}

export function resolveG2PieInnerRadius(chartType: string, deStyle: ChartDeStyle): number {
  const custom = readChartPieStyle(deStyle).innerRadiusPercent;
  if (custom != null && custom > 0) return custom / 100;
  if (chartType === "pie-donut" || chartType === "pie-donut-rose") return 0.5;
  if (chartType === "pie-rose") return 0.2;
  return 0;
}

export function colorPieSegments(
  rows: AntvPieRow[],
  chartColors: readonly string[],
  conditionalRules: ChartConditionalRule[] = [],
): G2PieSegmentRow[] {
  const active = conditionalRules.filter((rule) => rule.enabled && Number.isFinite(rule.value));
  const fallback = chartColors[0] ?? "#465fff";
  return rows.map((row, index) => {
    let segmentColor = chartColors[index % chartColors.length] ?? fallback;
    if (active.length > 0) {
      const matched = active.find((rule) => matchConditionalRule(row.value, rule));
      if (matched) segmentColor = matched.color;
    }
    return { ...row, segmentColor };
  });
}

export function buildG2PieRenderConfig(
  chartType: string,
  rows: AntvPieRow[],
  style: ChartStyleContext,
): G2PieRenderConfig {
  const tokens = getAntvThemeTokens(style.scheme);
  const orient = readChartLegendOrient(style.deStyle);
  const conditionalRules = style.deFeatures?.conditionalRules ?? [];

  return {
    data: colorPieSegments(rows, style.chartColors, conditionalRules),
    innerRadius: resolveG2PieInnerRadius(chartType, style.deStyle),
    outerRadius: G2_PIE_OUTER_RADIUS,
    isRose: isRosePieChartType(chartType),
    showLabel: style.showLabel,
    showTooltip: style.showTooltip,
    showLegend: !style.shellLegend && style.deStyle.legend?.show !== false,
    legendPosition: mapLegendPosition(readChartLegendPosition(style.deStyle), orient),
    labelFill: style.labelPresentation.color ?? tokens.axisLabel,
    labelFontSize: style.labelPresentation.fontSize,
    hoverScale: G2_PIE_HOVER_SCALE,
  };
}
