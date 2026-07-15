import type { EChartsOption } from "echarts";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartDeStyle } from "./chartDeStyle";
import { echartsTooltipValueFormatter } from "./chartValueFormat";
import { applyEchartsSeriesPresentation } from "./echartsSeriesPresentation";

const GRID_PAD = 8;
const LEGEND_ROW_HEIGHT = 24;
const DATA_ZOOM_SLIDER_HEIGHT = 18;
const DATA_ZOOM_BOTTOM_GAP = 4;

export type EchartsLayoutContext = {
  /** 看板 widget 内嵌：紧凑布局，禁用缩略轴彩色数据阴影 */
  embedded?: boolean;
};

type ChromeInsets = {
  gridTop: number;
  gridBottom: number;
  gridLeft: number;
  gridRight: number;
  legendBottom: number | undefined;
  legendTop: number | undefined;
  legendLeft: number | undefined;
  legendRight: number | undefined;
  showLegend: boolean;
  legendPos: NonNullable<ChartDeStyle["legend"]>["position"];
  dataZoom: boolean;
  compact: boolean;
};

function chartHasCartesianAxes(option: EChartsOption): boolean {
  return Boolean(option.xAxis ?? option.yAxis);
}

function chartHasPieSeries(option: EChartsOption): boolean {
  return (
    Array.isArray(option.series) &&
    option.series.some(
      (series) =>
        series &&
        typeof series === "object" &&
        (series as { type?: string }).type === "pie",
    )
  );
}

function chartHasMapSeries(option: EChartsOption): boolean {
  return (
    Array.isArray(option.series) &&
    option.series.some(
      (series) =>
        series &&
        typeof series === "object" &&
        (series as { type?: string }).type === "map",
    )
  );
}

/** 对标 DataEase：图例 / 缩略轴分层占位，避免底部彩色图例点压住绘图区 */
export function resolveEchartsChromeInsets(
  deStyle: ChartDeStyle,
  dataZoom: boolean,
  option: EChartsOption,
  context?: EchartsLayoutContext,
): ChromeInsets {
  const legendPos = deStyle.legend?.position ?? "bottom";
  const compact = Boolean(context?.embedded);
  const showLegend =
    deStyle.legend?.show === true && !chartHasMapSeries(option) && !compact;
  const hasPie = chartHasPieSeries(option);

  let gridTop = GRID_PAD + 4;
  let gridBottom = GRID_PAD + 4;
  let gridLeft = GRID_PAD;
  let gridRight = GRID_PAD;

  let legendTop: number | undefined;
  let legendBottom: number | undefined;
  let legendLeft: number | undefined;
  let legendRight: number | undefined;

  if (showLegend) {
    if (legendPos === "top") {
      legendTop = 0;
      gridTop += LEGEND_ROW_HEIGHT;
    } else if (legendPos === "bottom") {
      legendBottom = dataZoom
        ? DATA_ZOOM_BOTTOM_GAP + DATA_ZOOM_SLIDER_HEIGHT + 4
        : 0;
      gridBottom += LEGEND_ROW_HEIGHT;
    } else if (legendPos === "left") {
      legendLeft = 0;
      gridLeft += 72;
    } else if (legendPos === "right") {
      legendRight = 0;
      gridRight += 72;
    }
  }

  if (dataZoom) {
    gridBottom += DATA_ZOOM_SLIDER_HEIGHT + DATA_ZOOM_BOTTOM_GAP;
  }

  if (hasPie && showLegend && legendPos === "bottom") {
    gridBottom = Math.max(gridBottom, LEGEND_ROW_HEIGHT + (dataZoom ? DATA_ZOOM_SLIDER_HEIGHT + 8 : 4));
  }

  if (compact && dataZoom) {
    gridBottom = Math.max(gridBottom, DATA_ZOOM_SLIDER_HEIGHT + DATA_ZOOM_BOTTOM_GAP + 4);
  }

  return {
    gridTop,
    gridBottom,
    gridLeft,
    gridRight,
    legendTop,
    legendBottom,
    legendLeft,
    legendRight,
    showLegend,
    legendPos: legendPos ?? "bottom",
    dataZoom,
    compact,
  };
}

const LEGEND_LAYOUT: Record<
  NonNullable<ChartDeStyle["legend"]>["position"] & string,
  Record<string, unknown>
> = {
  top: { orient: "horizontal", left: "center" },
  bottom: { orient: "horizontal", left: "center" },
  left: { orient: "vertical", top: "middle" },
  right: { orient: "vertical", top: "middle" },
};

function applyPieInset(option: EChartsOption, insets: ChromeInsets): EChartsOption {
  if (!chartHasPieSeries(option) || !Array.isArray(option.series)) return option;
  const shift =
    insets.showLegend && insets.legendPos === "bottom"
      ? insets.dataZoom
        ? 10
        : 6
      : insets.showLegend && insets.legendPos === "top"
        ? -4
        : 0;
  if (shift === 0) return option;
  return {
    ...option,
    series: option.series.map((series) => {
      if (!series || typeof series !== "object" || (series as { type?: string }).type !== "pie") {
        return series;
      }
      const pie = series as { center?: [string | number, string | number] };
      const center = pie.center ?? ["50%", "50%"];
      const y = typeof center[1] === "number" ? center[1] : 50;
      return {
        ...pie,
        center: [center[0] ?? "50%", `${Math.max(38, y - shift)}%`],
      };
    }),
  };
}

export function applyDeStyleToEchartsOption(
  option: EChartsOption,
  deStyle: ChartDeStyle,
  dataZoom: boolean,
  options?: {
    showLabel?: boolean;
    valueFormat?: NumberFormatConfig;
    layout?: EchartsLayoutContext;
  },
): EChartsOption {
  const insets = resolveEchartsChromeInsets(deStyle, dataZoom, option, options?.layout);
  let next: EChartsOption = { ...option };

  const prevLegend =
    next.legend && typeof next.legend === "object" && !Array.isArray(next.legend)
      ? next.legend
      : {};
  next.legend = {
    ...prevLegend,
    show: insets.showLegend,
    type: insets.compact && insets.showLegend ? "scroll" : (prevLegend as { type?: string }).type,
    textStyle: {
      ...(typeof prevLegend.textStyle === "object" ? prevLegend.textStyle : {}),
      fontSize: deStyle.legend?.fontSize ?? 12,
    },
    ...LEGEND_LAYOUT[insets.legendPos ?? "bottom"],
    ...(insets.legendTop !== undefined ? { top: insets.legendTop } : {}),
    ...(insets.legendBottom !== undefined ? { bottom: insets.legendBottom } : {}),
    ...(insets.legendLeft !== undefined ? { left: insets.legendLeft } : {}),
    ...(insets.legendRight !== undefined ? { right: insets.legendRight } : {}),
  };

  if (dataZoom) {
    next.dataZoom = [
      {
        type: "slider",
        bottom: DATA_ZOOM_BOTTOM_GAP,
        height: DATA_ZOOM_SLIDER_HEIGHT,
        showDataShadow: false,
        showDetail: false,
        brushSelect: false,
        moveHandleSize: 0,
        borderColor: "transparent",
        backgroundColor: "rgba(148, 163, 184, 0.12)",
        fillerColor: "rgba(70, 95, 255, 0.18)",
        handleSize: insets.compact ? 10 : 12,
      },
      { type: "inside" },
    ];
  }

  if (chartHasCartesianAxes(next)) {
    const prevGrid =
      next.grid && typeof next.grid === "object" && !Array.isArray(next.grid) ? next.grid : {};
    next.grid = {
      ...prevGrid,
      left: insets.gridLeft,
      right: insets.gridRight,
      top: insets.gridTop,
      bottom: insets.gridBottom,
      containLabel: true,
    };
    if (insets.compact) {
      const compactAxis = (axis: unknown) => {
        if (!axis || typeof axis !== "object") return axis;
        const prev = axis as Record<string, unknown>;
        const prevLabel =
          prev.axisLabel && typeof prev.axisLabel === "object" ? prev.axisLabel : {};
        return {
          ...prev,
          axisLabel: {
            ...prevLabel,
            fontSize: 10,
            hideOverlap: true,
            interval: 0,
          },
        };
      };
      if (Array.isArray(next.xAxis)) {
        next.xAxis = next.xAxis.map(compactAxis);
      } else if (next.xAxis) {
        next.xAxis = compactAxis(next.xAxis);
      }
      if (Array.isArray(next.yAxis)) {
        next.yAxis = next.yAxis.map(compactAxis);
      } else if (next.yAxis) {
        next.yAxis = compactAxis(next.yAxis);
      }
    }
  }

  next = applyPieInset(next, insets);

  const showLabel = options?.showLabel ?? false;
  const valueFormat = options?.valueFormat;
  if (valueFormat) {
    const prevTooltip =
      next.tooltip && typeof next.tooltip === "object" ? next.tooltip : {};
    next.tooltip = {
      ...prevTooltip,
      valueFormatter: echartsTooltipValueFormatter(valueFormat),
    };
  }

  if (Array.isArray(next.series)) {
    next.series = next.series.map((s) => {
      if (!s || typeof s !== "object") return s;
      const series = { ...s } as Record<string, unknown>;
      if (showLabel) {
        series.label = {
          ...(typeof series.label === "object" ? series.label : {}),
          show: true,
          fontSize: deStyle.label?.fontSize ?? 12,
          formatter: valueFormat
            ? (params: { value?: unknown }) => {
                const v = params?.value;
                const raw = Array.isArray(v) ? v[v.length - 1] : v;
                return echartsTooltipValueFormatter(valueFormat)(raw);
              }
            : undefined,
        };
      }
      return series;
    });
  }

  next = applyEchartsSeriesPresentation(next, {
    embedded: options?.layout?.embedded,
    paletteOpacity: deStyle.paletteOpacity,
  });

  return next;
}
