import { useCallback, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import { applyDeStyleToEchartsOption } from "@/lib/echartsDeStyle";
import { applyEchartsColorSchemeTokens, getEchartsTheme } from "@/lib/echarts-theme";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartDeStyle } from "@/lib/chartDeStyle";
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
}: Props) {
  const chartRef = useRef<EChartsReact | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );
  const scheme = isDark ? "dark" : "light";
  const option = useMemo(() => {
    let built = buildEchartsOption(spec, capped, columns);
    built = applyDeStyleToEchartsOption(built, deStyle ?? {}, dataZoom, {
      showLabel,
      valueFormat,
      layout: { embedded: fill },
    });
    built = applyEchartsColorSchemeTokens(built, scheme);
    if (chartColors?.length) {
      built = { ...built, color: chartColors };
    }
    return built;
  }, [spec, capped, columns, deStyle, dataZoom, chartColors, showLabel, valueFormat, scheme]);
  const theme = useMemo(() => getEchartsTheme(scheme), [scheme]);

  const isEmpty =
    !option ||
    (Array.isArray((option as { series?: unknown[] }).series) &&
      (option as { series?: unknown[] }).series!.length === 0);

  const resizeChart = useCallback(() => {
    chartRef.current?.getEchartsInstance()?.resize();
  }, []);

  useEmbeddedChartLiveResize(fill && !isEmpty, containerRef, resizeChart);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full",
        fill ? "absolute inset-0 flex min-h-0 flex-col" : "min-h-[120px]",
      )}
      aria-label={ariaLabel}
    >
      {truncated ? (
        <p role="status" className="mb-2 shrink-0 text-theme-xs text-warning-600 dark:text-warning-400">
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条
        </p>
      ) : null}
      {isEmpty ? (
        <div
          className={cn(
            "flex items-center justify-center text-theme-xs text-gray-400 dark:text-gray-500",
            fill ? "min-h-0 flex-1" : "min-h-[180px]",
          )}
          role="status"
          aria-label="暂无数据"
        >
          暂无数据
        </div>
      ) : (
        <div className={cn(fill && "min-h-0 flex-1")}>
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
            data-testid="echarts-chart"
          />
        </div>
      )}
    </div>
  );
}
