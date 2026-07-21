import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import { renderD3CartesianChart } from "@/components/charts/engine/d3/cartesian/dispatch";
import {
  buildCartesianRenderConfig,
  d3CartesianTestId,
} from "@/components/charts/engine/d3/views/buildCartesianConfig";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
} from "@/components/charts/engine/buildDatasetEncoding";
import { useElementSize } from "@/hooks/useElementSize";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { cn } from "@/lib/utils";

function D3CartesianViewInner(props: ChartEngineViewProps) {
  const { viewModel, style, chartConfig, fill = false, height = 180, width, ariaLabel } = props;

  const plan = useMemo(() => {
    const base = buildChartRenderPlan(viewModel);
    return applyChartStyleChain(base, style, chartConfig);
  }, [viewModel, style, chartConfig]);

  const { rows: capped, truncated } = useMemo(
    () => capRows(viewModel.dataset.rows, ADVANCED_CHART_ROW_CAP),
    [viewModel.dataset.rows],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { ref: sizeRef, size } = useElementSize<HTMLDivElement>({ enabled: !fill });

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      sizeRef(node);
    },
    [sizeRef],
  );

  const testId = d3CartesianTestId(viewModel.chartType, plan.plotType);

  const rerender = useCallback(() => {
    const el = containerRef.current;
    if (!el || plan.kind !== "d3" || plan.empty || capped.length === 0) return;

    const chartWidth = fill ? el.clientWidth : (width ?? size.width ?? el.clientWidth);
    const chartHeight = fill ? el.clientHeight : height;
    const config = buildCartesianRenderConfig(props, plan, chartWidth, chartHeight);
    if (!config) return;
    renderD3CartesianChart(el, plan, config);
  }, [plan, capped.length, fill, width, height, size.width, size.height, props]);

  useEmbeddedChartLiveResize(fill && !plan.empty, containerRef, rerender, rerender);

  useEffect(() => {
    rerender();
  }, [rerender]);

  if (plan.empty || capped.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-theme-sm text-gray-400 dark:text-gray-500",
          fill ? "absolute inset-0" : "min-h-[180px]",
        )}
        role="status"
        aria-label="暂无数据"
      >
        暂无数据
      </div>
    );
  }

  return (
    <div
      className={cn("w-full", fill ? "absolute inset-0 flex min-h-0 flex-col" : "min-h-[120px]")}
      aria-label={ariaLabel}
    >
      {truncated && !fill ? (
        <p role="status" className="mb-2 shrink-0 text-theme-sm text-warning-600 dark:text-warning-400">
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条</p>
      ) : null}
      <div
        ref={setContainerRef}
        className={cn("relative", fill ? "min-h-0 flex-1" : "w-full")}
        data-testid={testId}
        style={fill ? undefined : { height, width: width ?? "100%" }}
      />
    </div>
  );
}

export const D3CartesianView = memo(D3CartesianViewInner);
