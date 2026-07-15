import type { EChartsOption } from "echarts";

/** 对标 DataEase 折线默认线宽（px） */
export const DE_LINE_WIDTH = 2.5;
export const DE_LINE_WIDTH_EMBEDDED = 3;
export const DE_LINE_SYMBOL_SIZE = 6;
export const DE_AREA_FILL_OPACITY = 0.22;
export const DE_BAR_MAX_WIDTH = "42%";
export const DE_BAR_RADIUS = 3;

type SeriesPresentationContext = {
  embedded?: boolean;
  paletteOpacity?: number;
};

function colorAlpha(opacity: number): number {
  if (!Number.isFinite(opacity)) return 1;
  return Math.min(1, Math.max(0, opacity));
}

function mergeRecord(
  base: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(base && typeof base === "object" ? (base as Record<string, unknown>) : {}),
    ...patch,
  };
}

function applyOpacityFactor(baseOpacity: number | undefined, factor: number): number {
  const seed = baseOpacity ?? 1;
  return colorAlpha(seed * factor);
}

function patchLineSeries(
  series: Record<string, unknown>,
  context: SeriesPresentationContext,
): Record<string, unknown> {
  const factor = colorAlpha(context.paletteOpacity ?? 1);
  const lineWidth = context.embedded ? DE_LINE_WIDTH_EMBEDDED : DE_LINE_WIDTH;
  const prevLineStyle =
    series.lineStyle && typeof series.lineStyle === "object"
      ? (series.lineStyle as Record<string, unknown>)
      : {};
  const prevEmphasis =
    series.emphasis && typeof series.emphasis === "object"
      ? (series.emphasis as Record<string, unknown>)
      : {};
  const prevEmphasisLine =
    prevEmphasis.lineStyle && typeof prevEmphasis.lineStyle === "object"
      ? (prevEmphasis.lineStyle as Record<string, unknown>)
      : {};

  const next: Record<string, unknown> = {
    ...series,
    symbol: series.symbol ?? "circle",
    symbolSize: series.symbolSize ?? DE_LINE_SYMBOL_SIZE,
    showSymbol: series.showSymbol ?? false,
    lineStyle: {
      ...prevLineStyle,
      width: prevLineStyle.width ?? lineWidth,
      opacity: applyOpacityFactor(prevLineStyle.opacity as number | undefined, factor),
    },
    emphasis: {
      ...prevEmphasis,
      focus: prevEmphasis.focus ?? "series",
      lineStyle: {
        ...prevEmphasisLine,
        width: (prevEmphasisLine.width as number | undefined) ?? lineWidth + 0.5,
      },
    },
  };

  if (series.areaStyle != null) {
    const prevArea =
      series.areaStyle && typeof series.areaStyle === "object"
        ? (series.areaStyle as Record<string, unknown>)
        : {};
    next.areaStyle = {
      ...prevArea,
      opacity: applyOpacityFactor(
        (prevArea.opacity as number | undefined) ?? DE_AREA_FILL_OPACITY,
        factor,
      ),
    };
  }

  const prevItem =
    series.itemStyle && typeof series.itemStyle === "object"
      ? (series.itemStyle as Record<string, unknown>)
      : {};
  if (factor < 1) {
    next.itemStyle = {
      ...prevItem,
      opacity: applyOpacityFactor(prevItem.opacity as number | undefined, factor),
    };
  }

  return next;
}

function patchBarSeries(
  series: Record<string, unknown>,
  context: SeriesPresentationContext,
): Record<string, unknown> {
  const factor = colorAlpha(context.paletteOpacity ?? 1);
  const prevItem =
    series.itemStyle && typeof series.itemStyle === "object"
      ? (series.itemStyle as Record<string, unknown>)
      : {};
  return {
    ...series,
    barMaxWidth: series.barMaxWidth ?? DE_BAR_MAX_WIDTH,
    itemStyle: mergeRecord(prevItem, {
      borderRadius: prevItem.borderRadius ?? DE_BAR_RADIUS,
      opacity: applyOpacityFactor(prevItem.opacity as number | undefined, factor),
    }),
  };
}

function patchPieSeries(
  series: Record<string, unknown>,
  context: SeriesPresentationContext,
): Record<string, unknown> {
  const factor = colorAlpha(context.paletteOpacity ?? 1);
  if (factor >= 1) return series;
  const prevItem =
    series.itemStyle && typeof series.itemStyle === "object"
      ? (series.itemStyle as Record<string, unknown>)
      : {};
  return {
    ...series,
    itemStyle: {
      ...prevItem,
      opacity: applyOpacityFactor(prevItem.opacity as number | undefined, factor),
    },
  };
}

/** 统一 ECharts 系列视觉（对标 DataEase：折线更醒目、柱/饼配色一致） */
export function applyEchartsSeriesPresentation(
  option: EChartsOption,
  context: SeriesPresentationContext = {},
): EChartsOption {
  if (!Array.isArray(option.series)) return option;

  return {
    ...option,
    series: option.series.map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const series = { ...entry } as Record<string, unknown>;
      const type = String(series.type ?? "");
      if (type === "line") return patchLineSeries(series, context);
      if (type === "bar") return patchBarSeries(series, context);
      if (type === "pie") return patchPieSeries(series, context);
      return series;
    }),
  };
}
