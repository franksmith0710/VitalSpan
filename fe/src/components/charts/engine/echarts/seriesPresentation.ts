import type { EChartsOption } from "@/components/charts/engine/echarts/echartsTypes";

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
  seriesGradient?: boolean;
};

function fadeHexColor(color: string, endAlpha = 0.35): string {
  const hex = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return color;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${endAlpha})`;
}

function gradientItemColor(baseColor: string): Record<string, unknown> {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: baseColor },
      { offset: 1, color: fadeHexColor(baseColor) },
    ],
  };
}

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
  const areaFactor = colorAlpha(context.paletteOpacity ?? 1);
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
    const areaPatch: Record<string, unknown> = {
      opacity: applyOpacityFactor(
        (prevArea.opacity as number | undefined) ?? DE_AREA_FILL_OPACITY,
        areaFactor,
      ),
    };
    if (context.seriesGradient) {
      const lineColor =
        typeof prevLineStyle.color === "string"
          ? prevLineStyle.color
          : typeof series.color === "string"
            ? series.color
            : undefined;
      if (lineColor) {
        areaPatch.color = gradientItemColor(lineColor);
      }
    }
    next.areaStyle = {
      ...prevArea,
      ...areaPatch,
    };
  } else if (context.seriesGradient) {
    const lineColor =
      typeof prevLineStyle.color === "string"
        ? prevLineStyle.color
        : typeof series.color === "string"
          ? series.color
          : undefined;
    if (lineColor) {
      next.lineStyle = {
        ...prevLineStyle,
        color: prevLineStyle.color ?? lineColor,
      };
    }
  }

  return next;
}

function patchBarSeries(
  series: Record<string, unknown>,
  context: SeriesPresentationContext,
): Record<string, unknown> {
  const prevItem =
    series.itemStyle && typeof series.itemStyle === "object"
      ? (series.itemStyle as Record<string, unknown>)
      : {};
  const baseColor =
    typeof prevItem.color === "string"
      ? prevItem.color
      : typeof series.color === "string"
        ? series.color
        : undefined;
  const itemStyle = mergeRecord(prevItem, {
    borderRadius: prevItem.borderRadius ?? DE_BAR_RADIUS,
    ...(context.seriesGradient && baseColor ? { color: gradientItemColor(baseColor) } : {}),
  });
  return {
    ...series,
    barMaxWidth: series.barMaxWidth ?? DE_BAR_MAX_WIDTH,
    itemStyle,
  };
}

function patchPieSeries(
  series: Record<string, unknown>,
  _context: SeriesPresentationContext,
): Record<string, unknown> {
  return series;
}

/** 在全局 color 赋值后应用系列渐变（对标 DE「渐变颜色」） */
export function applyEchartsSeriesGradient(
  option: EChartsOption,
  colors: readonly string[],
  enabled?: boolean,
): EChartsOption {
  if (!enabled || !Array.isArray(option.series) || colors.length === 0) return option;

  return {
    ...option,
    series: option.series.map((entry, index) => {
      if (!entry || typeof entry !== "object") return entry;
      const series = { ...entry } as Record<string, unknown>;
      const type = String(series.type ?? "");
      const baseColor = colors[index % colors.length];
      if (type === "bar") {
        const prevItem =
          series.itemStyle && typeof series.itemStyle === "object"
            ? (series.itemStyle as Record<string, unknown>)
            : {};
        series.itemStyle = {
          ...prevItem,
          color: gradientItemColor(baseColor),
        };
      }
      if (type === "line" && series.areaStyle != null) {
        const prevArea =
          series.areaStyle && typeof series.areaStyle === "object"
            ? (series.areaStyle as Record<string, unknown>)
            : {};
        series.areaStyle = {
          ...prevArea,
          color: gradientItemColor(baseColor),
        };
      }
      return series;
    }),
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
