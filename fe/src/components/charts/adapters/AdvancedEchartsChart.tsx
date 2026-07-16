import { useCallback, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import { applyDeStyleToEchartsOption } from "@/lib/echartsDeStyle";
import { applyChartAdvancedFeaturesToEchartsOption } from "@/lib/chartDeFeatures";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { applyEchartsColorSchemeTokens, getEchartsTheme } from "@/lib/echarts-theme";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { readChartDeStyle, readChartGeoStyle, readChartPieStyle, type ChartDeStyle } from "@/lib/chartDeStyle";
import { analyzeGeoMapMatch, buildGeoMapPlaceholderEchartsOption, buildGeoHeatmapPlaceholderEchartsOption, isGeoHeatmapPlaceholderOption, isGeoMapPlaceholderOption } from "@/lib/geoMapChart";
import { dwHint } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
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
  /** 填满父容器（看板 widget 内嵌） */
  fill?: boolean;
  height?: number;
  width?: number;
  /** @deprecated 保留兼容 */
  resizeDebounceMs?: number;
  deStyle?: ChartDeStyle;
  dataZoom?: boolean;
  chartColors?: string[];
  showLabel?: boolean;
  valueFormat?: NumberFormatConfig;
  /** 地图占位态提示文案（对标 DataEase 图案地图） */
  mapPlaceholderHint?: string;
  /** 热力图占位态提示文案 */
  heatmapPlaceholderHint?: string;
  /** 看板编辑态内嵌：关闭地图滚轮缩放 */
  embedEdit?: boolean;
  /** 图表元素点击下钻（预览/查看态） */
  onDrillClick?: (name: string) => void;
  /** 高级 · 跳转（查看态点击） */
  onJumpClick?: () => void;
  chartConfig?: ChartViewConfig;
  /** 看板内嵌：图例由组件外壳 DOM 渲染 */
  shellLegend?: boolean;
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
  valueFormat,
  mapPlaceholderHint,
  heatmapPlaceholderHint,
  embedEdit = false,
  onDrillClick,
  onJumpClick,
  chartConfig,
  shellLegend = false,
}: Props) {
  const chartRef = useRef<EChartsReact | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );
  const scheme = isDark ? "dark" : "light";
  const geoMatchStats = useMemo(() => {
    if (spec.chartType !== "map") return null;
    const regionField = spec.encoding.dimensions[0]?.field;
    if (!regionField) return null;
    return analyzeGeoMapMatch(capped, columns, regionField);
  }, [spec, capped, columns]);

  const option = useMemo(() => {
    const geoStyle = readChartGeoStyle(deStyle ?? {});
    const pieStyle = readChartPieStyle(deStyle ?? {});
    let built = buildEchartsOption(spec, capped, columns, {
      geo: geoStyle,
      showLabel,
      pie: pieStyle,
      isDark: scheme === "dark",
      embedEdit,
      valueFormat,
    });
    if (spec.chartType === "map" && isGeoMapPlaceholderOption(built)) {
      built = buildGeoMapPlaceholderEchartsOption({
        geo: geoStyle,
        isDark: scheme === "dark",
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
      valueFormat,
      layout: { embedded: fill, shellLegend },
    });
    built = applyEchartsColorSchemeTokens(built, scheme);
    if (chartColors?.length) {
      built = { ...built, color: chartColors };
    }
    if (chartConfig) {
      built = applyChartAdvancedFeaturesToEchartsOption(
        built as Record<string, unknown>,
        chartConfig,
      );
    }
    return built;
  }, [spec, capped, columns, deStyle, dataZoom, chartColors, showLabel, valueFormat, scheme, shellLegend, chartConfig, fill, embedEdit]);
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

  const chartEvents = useMemo(() => {
    if (!onDrillClick && !onJumpClick) return undefined;
    return {
      click: (params: { name?: string | number }) => {
        if (onJumpClick) {
          onJumpClick();
          return;
        }
        if (params?.name == null || params.name === "") return;
        onDrillClick?.(String(params.name));
      },
    };
  }, [onDrillClick, onJumpClick]);

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
      {geoMatchWarning ? (
        <p
          role="status"
          className={cn(
            "shrink-0 text-theme-xs text-warning-600 dark:text-warning-400",
            fill ? "pointer-events-none absolute inset-x-2 top-2 z-[2] rounded-md bg-warning-500/10 px-2 py-1" : "mb-2",
          )}
        >
          {geoMatchWarning}
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
        <div className={cn(fill && "relative min-h-0 flex-1")}>
          <ReactECharts
            key={isDark ? "dark" : "light"}
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
