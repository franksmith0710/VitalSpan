import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import { applyDeStyleToEchartsOption } from "@/components/charts/engine/echarts/applyEchartsStyle";
import { applyDataScreenSurfaceToEchartsOption } from "@/lib/screenChartTheme";
import { applyEchartsSeriesGradient } from "@/components/charts/engine/echarts/seriesPresentation";
import { applyChartSeriesColorOverrides, resolveChartSeriesColorItems } from "@/lib/chartSeriesColor";
import { applyChartAdvancedFeaturesToEchartsOption } from "@/lib/chartDeFeatures";
import { applyEchartsColorSchemeTokens, getEchartsTheme } from "@/components/charts/engine/echarts/theme";
import { readChartGeoStyle, readChartPieStyle } from "@/lib/chartDeStyle";
import { echartsGeoEngine } from "@/components/charts/engine/geoEnginePort";
import { findMapDrillFilterValue } from "@/components/charts/engine/echarts/geo/geoMapLevels";
import { VIZ_WHEEL_ZOOM_SURFACE_ATTR } from "@/components/dashboard/pixelCanvas/pixelCanvasWheelScroll";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { readEmbeddedContainerSize } from "@/components/charts/engine/embeddedContainerSize";
import { useChartVisualScale } from "@/hooks/useChartVisualScale";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import { useGeoMapLevel } from "@/hooks/useGeoMapLevel";
import {
  ADVANCED_CHART_ROW_CAP,
  buildEchartsOption,
  capRows,
} from "@/components/charts/engine/echarts/buildEchartsOption";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import type { ChartEngineViewProps, ChartInteractionEvent } from "@/components/charts/engine/types";

function echartsEnginePropsEqual(
  prev: ChartEngineViewProps,
  next: ChartEngineViewProps,
): boolean {
  return (
    prev.viewModel === next.viewModel &&
    prev.style === next.style &&
    prev.ariaLabel === next.ariaLabel &&
    prev.isDark === next.isDark &&
    prev.fill === next.fill &&
    prev.height === next.height &&
    prev.width === next.width &&
    prev.mapPlaceholderHint === next.mapPlaceholderHint &&
    prev.mapDrillError === next.mapDrillError &&
    prev.heatmapPlaceholderHint === next.heatmapPlaceholderHint &&
    prev.drillLookupRows === next.drillLookupRows &&
    prev.chartConfig === next.chartConfig &&
    prev.style.shellLegend === next.style.shellLegend &&
    prev.drillStack === next.drillStack &&
    prev.drillClickField === next.drillClickField &&
    prev.onInteraction === next.onInteraction &&
    prev.onJumpClick === next.onJumpClick
  );
}

function EchartsEngineViewInner({
  viewModel,
  style,
  ariaLabel,
  isDark = false,
  fill = false,
  height = 180,
  width,
  mapPlaceholderHint,
  mapDrillError,
  heatmapPlaceholderHint,
  drillLookupRows,
  chartConfig,
  drillStack = [],
  drillClickField,
  onInteraction,
  onJumpClick,
}: ChartEngineViewProps) {
  const chartRef = useRef<EChartsReact | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isShapePlaying = usePixelShapePlayer();
  const visualScale = useChartVisualScale();
  const spec = useMemo(() => chartViewModelToRenderSpec(viewModel), [viewModel]);
  const rows = viewModel.dataset.rows;
  const columns = viewModel.dataset.columns;
  const { deStyle, dataZoom, chartColors, showLabel, showTooltip, seriesGradient, valueFormat, dataScreenSurface, shellLegend, embedEdit } = style;
  const labelPresentation = style.labelPresentation;
  const tooltipPresentation = style.tooltipPresentation;

  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );
  const scheme = isDark ? "dark" : "light";
  const geoStyle = useMemo(() => readChartGeoStyle(deStyle), [deStyle]);
  const mapWheelZoom =
    spec.chartType === "map" && echartsGeoEngine.resolveEmbeddedRoam(geoStyle.roam);
  const mapDrillEnabled = spec.chartType === "map" && Boolean(chartConfig);
  const { context: geoMapLevel, loading: geoMapLoading } = useGeoMapLevel({
    enabled: mapDrillEnabled,
    config: chartConfig,
    drillStack,
  });

  const geoMatchStats = useMemo(() => {
    if (spec.chartType !== "map") return null;
    const regionField = spec.encoding.dimensions[0]?.field;
    if (!regionField) return null;
    return echartsGeoEngine.analyzeMatch(
      capped,
      columns,
      regionField,
      geoMapLevel.knownRegionNames,
      geoMapLevel.drillDepth === 0,
    );
  }, [spec, capped, columns, geoMapLevel]);

  const option = useMemo(() => {
    const pieStyle = readChartPieStyle(deStyle);
    let built = buildEchartsOption(spec, capped, columns, {
      geo: geoStyle,
      showLabel,
      pie: pieStyle,
      isDark: scheme === "dark",
      embedEdit,
      valueFormat,
      geoMapLevel:
        spec.chartType === "map"
          ? {
              mapId: geoMapLevel.mapId,
              knownRegionNames: geoMapLevel.knownRegionNames,
            }
          : undefined,
    });
    if (spec.chartType === "map" && echartsGeoEngine.isMapPlaceholder(built)) {
      built = echartsGeoEngine.buildMapPlaceholder({
        geo: geoStyle,
        isDark: scheme === "dark",
        roam: echartsGeoEngine.resolveEmbeddedRoam(geoStyle.roam),
      });
    }
    if (spec.chartType === "heatmap" && echartsGeoEngine.isHeatmapPlaceholder(built)) {
      built = echartsGeoEngine.buildHeatmapPlaceholder({
        geo: geoStyle,
        isDark: scheme === "dark",
      });
    }
    built = applyDeStyleToEchartsOption(built, deStyle, dataZoom, {
      showLabel,
      showTooltip,
      seriesGradient,
      valueFormat,
      labelPresentation,
      tooltipPresentation,
      layout: { embedded: fill, shellLegend },
    });
    if (dataScreenSurface) {
      built = applyDataScreenSurfaceToEchartsOption(built);
    }
    built = applyEchartsColorSchemeTokens(built, scheme);
    if (chartColors.length > 0) {
      built = { ...built, color: chartColors };
      built = applyEchartsSeriesGradient(built, chartColors, seriesGradient);
    }
    if (chartConfig && deStyle.seriesColor?.length) {
      const seriesItems = resolveChartSeriesColorItems(
        chartConfig,
        deStyle.paletteId,
        deStyle.seriesColor,
      );
      built = applyChartSeriesColorOverrides(built, seriesItems);
    }
    if (chartConfig) {
      built = applyChartAdvancedFeaturesToEchartsOption(
        built as Record<string, unknown>,
        chartConfig,
      );
    }
    return built;
  }, [
    spec,
    capped,
    columns,
    deStyle,
    dataZoom,
    chartColors,
    showLabel,
    showTooltip,
    seriesGradient,
    labelPresentation,
    tooltipPresentation,
    valueFormat,
    scheme,
    shellLegend,
    chartConfig,
    fill,
    embedEdit,
    geoStyle,
    geoMapLevel,
    dataScreenSurface,
  ]);
  const theme = useMemo(() => getEchartsTheme(scheme), [scheme]);

  const isMapPlaceholder =
    spec.chartType === "map" && echartsGeoEngine.isMapPlaceholder(option);
  const isHeatmapPlaceholder =
    spec.chartType === "heatmap" && echartsGeoEngine.isHeatmapPlaceholder(option);
  const isGeoPlaceholder = isMapPlaceholder || isHeatmapPlaceholder;

  const isEmpty =
    !isGeoPlaceholder &&
    (!option ||
      (Array.isArray((option as { series?: unknown[] }).series) &&
        (option as { series?: unknown[] }).series!.length === 0));

  const resizeChart = useCallback(() => {
    const next = readEmbeddedContainerSize(containerRef.current);
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart || !next) return;
    chart.resize({
      width: next.width,
      height: next.height,
      animation: { duration: 0 },
    });
  }, []);

  useEmbeddedChartLiveResize(fill && !isEmpty, containerRef, resizeChart, resizeChart);

  useEffect(() => {
    if (!fill || isEmpty || isShapePlaying) return;
    resizeChart();
  }, [visualScale, fill, isEmpty, isShapePlaying, resizeChart]);

  const placeholderHint =
    isMapPlaceholder ? mapPlaceholderHint
    : isHeatmapPlaceholder ? heatmapPlaceholderHint
    : null;

  const geoMatchWarning =
    geoMatchStats &&
    geoMatchStats.total > 0 &&
    geoMatchStats.matched < geoMatchStats.total
      ? `有 ${geoMatchStats.total - geoMatchStats.matched} 条无法匹配地图区域`
      : null;

  const geoAssetWarning = geoMapLevel.missingAsset ?? mapDrillError ?? null;

  const emitInteraction = useCallback(
    (event: ChartInteractionEvent) => {
      onInteraction?.(event);
    },
    [onInteraction],
  );

  const chartEvents = useMemo(() => {
    if (!onInteraction && !onJumpClick) return undefined;
    return {
      click: (params: { name?: string | number }) => {
        if (onJumpClick) {
          onJumpClick();
          return;
        }
        if (params?.name == null || params.name === "") return;
        const label = String(params.name);
        if (!onInteraction) return;
        if (drillClickField) {
          const lookupRows = drillLookupRows ?? rows;
          const filterValue = findMapDrillFilterValue(
            label,
            drillClickField,
            lookupRows,
            columns,
            geoMapLevel.knownRegionNames,
          );
          emitInteraction({ kind: "drill", value: filterValue, label });
          return;
        }
        emitInteraction({ kind: "drill", value: label, label });
      },
    };
  }, [
    onInteraction,
    onJumpClick,
    drillClickField,
    drillLookupRows,
    rows,
    columns,
    geoMapLevel.knownRegionNames,
    emitInteraction,
  ]);

  const chartKey = `${scheme}:${geoMapLevel.mapId}`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full",
        fill ? "absolute inset-0 flex min-h-0 flex-col" : "min-h-[120px]",
      )}
      aria-label={ariaLabel}
    >
      {truncated && !fill ? (
        <p role="status" className="mb-2 shrink-0 text-theme-sm text-warning-600 dark:text-warning-400">
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条
        </p>
      ) : null}
      {(geoMatchWarning || geoAssetWarning) ? (
        <p
          role="status"
          className={cn(
            "shrink-0 text-theme-xs text-warning-600 dark:text-warning-400",
            fill ? "pointer-events-none absolute inset-x-2 top-2 z-[2] rounded-md bg-warning-500/10 px-2 py-1" : "mb-2",
          )}
        >
          {[geoAssetWarning, geoMatchWarning].filter(Boolean).join("；")}
        </p>
      ) : null}
      {isEmpty ? (
        <div
          className={cn(
            "flex items-center justify-center text-theme-sm text-gray-400 dark:text-gray-500",
            fill ? "min-h-0 flex-1" : "min-h-[180px]",
          )}
          role="status"
          aria-label="暂无数据"
        >
          暂无数据
        </div>
      ) : (
        <div
          className={cn(fill && "relative min-h-0 flex-1")}
          {...(mapWheelZoom ? { [VIZ_WHEEL_ZOOM_SURFACE_ATTR]: "true" } : {})}
        >
          {geoMapLoading ? (
            <p
              role="status"
              className={cn(
                "pointer-events-none absolute inset-x-2 top-2 z-[2] text-theme-xs text-gray-500 dark:text-gray-400",
                fill ? "" : "mb-2",
              )}
            >
              正在加载{geoMapLevel.levelLabel}地图…
            </p>
          ) : null}
          <ReactECharts
            key={chartKey}
            ref={chartRef}
            option={option}
            theme={theme}
            style={
              fill
                ? { height: "100%", width: "100%", minHeight: 0 }
                : { height, width: width ?? "100%" }
            }
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
            autoResize={false}
            onEvents={chartEvents}
            data-testid="echarts-chart"
          />
          {placeholderHint ? (
            <p
              className={cn(
                "dw-hint pointer-events-none absolute inset-x-0 text-center",
                isHeatmapPlaceholder ? "bottom-[18%]" : "bottom-[10%]",
              )}
              role="status"
            >
              {placeholderHint}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const EchartsEngineView = memo(EchartsEngineViewInner, echartsEnginePropsEqual);
