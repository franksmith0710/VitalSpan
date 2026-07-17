import { useCallback, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import { applyDeStyleToEchartsOption } from "@/lib/echartsDeStyle";
import { applyEchartsSeriesGradient } from "@/lib/echartsSeriesPresentation";
import { applyChartAdvancedFeaturesToEchartsOption } from "@/lib/chartDeFeatures";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { applyEchartsColorSchemeTokens, getEchartsTheme } from "@/lib/echarts-theme";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { readChartDeStyle, readChartGeoStyle, readChartPieStyle, type ChartDeStyle } from "@/lib/chartDeStyle";
import { analyzeGeoMapMatch, buildGeoMapPlaceholderEchartsOption, buildGeoHeatmapPlaceholderEchartsOption, isGeoHeatmapPlaceholderOption, isGeoMapPlaceholderOption, resolveEmbeddedGeoRoam } from "@/lib/geoMapChart";
import { findMapDrillFilterValue } from "@/lib/geoMapLevels";
import { VIZ_WHEEL_ZOOM_SURFACE_ATTR } from "@/components/dashboard/pixelCanvas/pixelCanvasWheelScroll";
import { dwHint } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { useGeoMapLevel } from "@/hooks/useGeoMapLevel";
import type { ChartDrillFrame } from "@/lib/chartDrill";
import {
  ADVANCED_CHART_ROW_CAP,
  buildEchartsOption,
  capRows,
  type RenderSpec,
} from "./renderFromSpec";

type Props = {
  spec: RenderSpec;
  rows: unknown[][];
  columns: string[];
  ariaLabel: string;
  isDark?: boolean;
  fill?: boolean;
  height?: number;
  width?: number;
  resizeDebounceMs?: number;
  deStyle?: ChartDeStyle;
  dataZoom?: boolean;
  chartColors?: string[];
  showLabel?: boolean;
  showTooltip?: boolean;
  seriesGradient?: boolean;
  valueFormat?: NumberFormatConfig;
  mapPlaceholderHint?: string;
  mapDrillError?: string | null;
  heatmapPlaceholderHint?: string;
  /** 下钻点击时用于解析过滤值的全量行（未采样、未聚合） */
  drillLookupRows?: unknown[][];
  embedEdit?: boolean;
  onDrillClick?: (value: string, label?: string) => void;
  onJumpClick?: () => void;
  chartConfig?: ChartViewConfig;
  shellLegend?: boolean;
  drillStack?: ChartDrillFrame[];
  drillClickField?: string;
};

export function AdvancedEchartsChart({
  spec,
  rows,
  columns,
  ariaLabel,
  isDark = false,
  fill = false,
  height = 180,
  width,
  deStyle,
  dataZoom = false,
  chartColors,
  showLabel = false,
  showTooltip = true,
  seriesGradient = false,
  valueFormat,
  mapPlaceholderHint,
  mapDrillError,
  heatmapPlaceholderHint,
  drillLookupRows,
  embedEdit = false,
  onDrillClick,
  onJumpClick,
  chartConfig,
  shellLegend = false,
  drillStack = [],
  drillClickField,
}: Props) {
  const chartRef = useRef<EChartsReact | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );
  const scheme = isDark ? "dark" : "light";
  const geoStyle = useMemo(() => readChartGeoStyle(deStyle ?? {}), [deStyle]);
  const mapWheelZoom = spec.chartType === "map" && resolveEmbeddedGeoRoam(geoStyle.roam);
  const mapDrillEnabled = spec.chartType === "map" && Boolean(chartConfig);
  const { context: geoMapLevel, loading: geoMapLoading, version: geoMapVersion } = useGeoMapLevel({
    enabled: mapDrillEnabled,
    config: chartConfig,
    drillStack,
  });

  const geoMatchStats = useMemo(() => {
    if (spec.chartType !== "map") return null;
    const regionField = spec.encoding.dimensions[0]?.field;
    if (!regionField) return null;
    return analyzeGeoMapMatch(
      capped,
      columns,
      regionField,
      geoMapLevel.knownRegionNames,
      geoMapLevel.drillDepth === 0,
    );
  }, [spec, capped, columns, geoMapLevel]);

  const option = useMemo(() => {
    const pieStyle = readChartPieStyle(deStyle ?? {});
    let built = buildEchartsOption(spec, capped, columns, {
      geo: geoStyle,
      showLabel,
      pie: pieStyle,
      isDark: scheme === "dark",
      embedEdit,
      valueFormat,
      geoMapLevel: spec.chartType === "map"
        ? {
            mapId: geoMapLevel.mapId,
            knownRegionNames: geoMapLevel.knownRegionNames,
          }
        : undefined,
    });
    if (spec.chartType === "map" && isGeoMapPlaceholderOption(built)) {
      built = buildGeoMapPlaceholderEchartsOption({
        geo: geoStyle,
        isDark: scheme === "dark",
        roam: resolveEmbeddedGeoRoam(geoStyle.roam),
      });
    }
    if (spec.chartType === "heatmap" && isGeoHeatmapPlaceholderOption(built)) {
      built = buildGeoHeatmapPlaceholderEchartsOption({
        geo: geoStyle,
        isDark: scheme === "dark",
      });
    }
    built = applyDeStyleToEchartsOption(built, deStyle ?? {}, dataZoom, {
      showLabel,
      showTooltip,
      seriesGradient,
      valueFormat,
      layout: { embedded: fill, shellLegend },
    });
    built = applyEchartsColorSchemeTokens(built, scheme);
    if (chartColors?.length) {
      built = { ...built, color: chartColors };
      built = applyEchartsSeriesGradient(built, chartColors, seriesGradient);
    }
    if (chartConfig) {
      built = applyChartAdvancedFeaturesToEchartsOption(
        built as Record<string, unknown>,
        chartConfig,
      );
    }
    return built;
  }, [spec, capped, columns, deStyle, dataZoom, chartColors, showLabel, showTooltip, seriesGradient, valueFormat, scheme, shellLegend, chartConfig, fill, embedEdit, geoStyle, geoMapLevel, geoMapVersion]);
  const theme = useMemo(() => getEchartsTheme(scheme), [scheme]);

  const isMapPlaceholder =
    spec.chartType === "map" && isGeoMapPlaceholderOption(option as Record<string, unknown>);
  const isHeatmapPlaceholder =
    spec.chartType === "heatmap" && isGeoHeatmapPlaceholderOption(option as Record<string, unknown>);
  const isGeoPlaceholder = isMapPlaceholder || isHeatmapPlaceholder;

  const isEmpty =
    !isGeoPlaceholder &&
    (!option ||
      (Array.isArray((option as { series?: unknown[] }).series) &&
        (option as { series?: unknown[] }).series!.length === 0));

  const resizeChart = useCallback(() => {
    chartRef.current?.getEchartsInstance()?.resize();
  }, []);

  useEmbeddedChartLiveResize(fill && !isEmpty, containerRef, resizeChart);

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

  const chartEvents = useMemo(() => {
    if (!onDrillClick && !onJumpClick) return undefined;
    return {
      click: (params: { name?: string | number }) => {
        if (onJumpClick) {
          onJumpClick();
          return;
        }
        if (params?.name == null || params.name === "") return;
        const label = String(params.name);
        if (!onDrillClick) return;
        if (drillClickField) {
          const lookupRows = drillLookupRows ?? rows;
          const filterValue = findMapDrillFilterValue(
            label,
            drillClickField,
            lookupRows,
            columns,
            geoMapLevel.knownRegionNames,
          );
          onDrillClick(filterValue, label);
          return;
        }
        onDrillClick(label);
      },
    };
  }, [onDrillClick, onJumpClick, drillClickField, drillLookupRows, rows, columns, geoMapLevel.knownRegionNames]);

  const chartKey = `${scheme}:${geoMapLevel.mapId}:${geoMapVersion}`;

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
            autoResize={fill}
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
