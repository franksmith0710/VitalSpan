import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import { applyDeStyleToEchartsOption } from "@/lib/echartsDeStyle";
import { getEchartsTheme } from "@/lib/echarts-theme";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartDeStyle } from "@/lib/chartDeStyle";
import { cn } from "@/lib/utils";
import { usePixelShapeLiveResize } from "@/hooks/usePixelShapeLiveResize";
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
  const resizeFrameRef = useRef<number | null>(null);

  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );
  const option = useMemo(() => {
    let built = buildEchartsOption(spec, capped, columns);
    built = applyDeStyleToEchartsOption(built, deStyle ?? {}, dataZoom, {
      showLabel,
      valueFormat,
    });
    if (chartColors?.length) {
      built = { ...built, color: chartColors };
    }
    return built;
  }, [spec, capped, columns, deStyle, dataZoom, chartColors, showLabel, valueFormat]);
  const theme = useMemo(() => getEchartsTheme(isDark), [isDark]);

  const isEmpty =
    !option ||
    (Array.isArray((option as { series?: unknown[] }).series) &&
      (option as { series?: unknown[] }).series!.length === 0);

  const resizeChart = useCallback(() => {
    chartRef.current?.getEchartsInstance()?.resize();
  }, []);

  const scheduleResize = useCallback(() => {
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      resizeChart();
    });
  }, [resizeChart]);

  usePixelShapeLiveResize(fill, scheduleResize);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isEmpty) return;

    const hosts = new Set<HTMLElement>([el]);
    if (fill) {
      const shapeOuter = el.closest(".shape, .pixel-shape-outer");
      const shapeInner = el.closest(".pixel-shape-inner");
      if (shapeOuter instanceof HTMLElement) hosts.add(shapeOuter);
      if (shapeInner instanceof HTMLElement) hosts.add(shapeInner);
    }

    const observer = new ResizeObserver(() => scheduleResize());
    for (const host of hosts) observer.observe(host);
    scheduleResize();
    return () => {
      observer.disconnect();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [fill, isEmpty, scheduleResize]);

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
