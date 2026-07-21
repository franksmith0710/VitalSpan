import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { ChartStyleContext } from "@/components/charts/engine/types";

export type D3TooltipPresentation = {
  fontSize: number;
  color?: string;
  background?: string;
};

export type D3LabelPresentation = {
  fontSize: number;
  color?: string;
};

export type D3LegendPresentation = {
  position: "top" | "bottom" | "left" | "right";
  orient: "horizontal" | "vertical";
};

export function buildD3PresentationProps(style: ChartStyleContext) {
  const legend = style.deStyle.legend;
  return {
    labelFontSize: style.labelPresentation.fontSize,
    labelColor: style.labelPresentation.color,
    seriesGradient: style.seriesGradient,
    tooltipPresentation: style.tooltipPresentation,
    legendLayout: {
      position: legend?.position ?? "bottom",
      orient: legend?.orient ?? "horizontal",
    } satisfies D3LegendPresentation,
  };
}

export function resolveLabelFill(theme: AntvThemeTokens, labelColor?: string): string {
  return labelColor ?? theme.axisLabel;
}
