import { useEffect, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import { getEchartsTheme } from "@/lib/echarts-theme";
import { cn } from "@/lib/utils";
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
  /** @deprecated 使用 freezeResize */
  resizeDebounceMs?: number;
  /** 拖拽缩放中冻结 echarts.resize，松手后对齐 */
  freezeResize?: boolean;
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
  freezeResize = false,
}: Props) {
  const chartRef = useRef<EChartsReact | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frozenRef = useRef(freezeResize);
  frozenRef.current = freezeResize;

  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );
  const option = useMemo(
    () => buildEchartsOption(spec, capped, columns),
    [spec, capped, columns],
  );
  const theme = useMemo(() => getEchartsTheme(isDark), [isDark]);

  const isEmpty =
    !option ||
    (Array.isArray((option as { series?: unknown[] }).series) &&
      (option as { series?: unknown[] }).series!.length === 0);

  const resizeChart = () => {
    chartRef.current?.getEchartsInstance()?.resize();
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isEmpty) return;

    const observer = new ResizeObserver(() => {
      if (!frozenRef.current) resizeChart();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isEmpty]);

  useEffect(() => {
    if (!freezeResize) resizeChart();
  }, [freezeResize]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full", fill ? "flex h-full min-h-0 flex-col" : "min-h-[120px]")}
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
        <ReactECharts
          ref={chartRef}
          option={option}
          theme={theme}
          style={fill ? { height: "100%", width: "100%", minHeight: 0 } : { height, width: width ?? "100%" }}
          opts={{ renderer: "canvas" }}
          notMerge
          lazyUpdate
          autoResize={false}
          data-testid="echarts-chart"
        />
      )}
    </div>
  );
}
