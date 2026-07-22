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
  icon?: import("@/lib/chartDeStyle").ChartLegendIconShape;
  iconSize?: number;
  fontSize?: number;
  color?: string;
  hAlign?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
};

export function buildD3PresentationProps(style: ChartStyleContext) {
  const legend = style.deStyle.legend;
  return {
    labelFontSize: style.labelPresentation.fontSize,
    labelColor: style.labelPresentation.color,
    seriesGradient: style.seriesGradient,
    depthVisual: style.depthVisual,
    tooltipPresentation: style.tooltipPresentation,
    legendLayout: {
      position: legend?.position ?? "bottom",
      orient: legend?.orient ?? "horizontal",
      icon: legend?.icon,
      iconSize: legend?.iconSize,
      fontSize: legend?.fontSize,
      color: legend?.color,
      hAlign: legend?.hAlign,
      vAlign: legend?.vAlign,
    } satisfies D3LegendPresentation,
  };
}

export function resolveLabelFill(theme: AntvThemeTokens, labelColor?: string): string {
  return labelColor ?? theme.axisLabel;
}
