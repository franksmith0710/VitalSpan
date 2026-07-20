import { memo, useCallback, useMemo } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildAntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import { useG2Plot } from "@/components/charts/engine/antv/useG2Plot";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
} from "@/components/charts/engine/buildDatasetEncoding";

function extractDrillValue(
  datum: Record<string, unknown>,
  options: Record<string, unknown>,
): string {
  const xField = options.xField as string | undefined;
  const angleField = options.angleField as string | undefined;
  const colorField = options.colorField as string | undefined;
  const stageField = options.xField === "stage" ? "stage" : undefined;
  const candidates = [
    xField ? datum[xField] : undefined,
    angleField ? datum[angleField] : undefined,
    colorField ? datum[colorField] : undefined,
    stageField ? datum[stageField] : undefined,
    datum.type,
    datum.name,
    datum.stage,
    datum.x,
    datum.source,
  ];
  for (const c of candidates) {
    if (c != null && String(c) !== "") return String(c);
  }
  return "";
}

function AntvG2PlotViewInner(props: ChartEngineViewProps) {
  const { viewModel, style, chartConfig, fill = false, height = 180, width, ariaLabel, onInteraction, onJumpClick } = props;
  const plan = useMemo(() => {
    const base = buildAntvRenderPlan(viewModel);
    return applyChartStyleChain(base, style, chartConfig);
  }, [viewModel, style, chartConfig]);
  const { rows: capped, truncated } = useMemo(
    () => capRows(viewModel.dataset.rows, ADVANCED_CHART_ROW_CAP),
    [viewModel.dataset.rows],
  );

  const optionsKey = useMemo(() => JSON.stringify(plan.options), [plan.options]);
  const plotOptions = useMemo(() => plan.options, [optionsKey]);

  const handleElementClick = useCallback(
    (datum: Record<string, unknown>) => {
      if (onJumpClick) {
        onJumpClick();
        return;
      }
      if (!onInteraction) return;
      const value = extractDrillValue(datum, plotOptions);
      if (!value) return;
      onInteraction({ kind: "drill", value, label: value });
    },
    [onJumpClick, onInteraction, plotOptions],
  );

  const interactionHandlers = useMemo(
    () =>
      onInteraction || onJumpClick ? { onElementClick: handleElementClick } : undefined,
    [onInteraction, onJumpClick, handleElementClick],
  );

  const { containerRef, resize } = useG2Plot(
    plan.kind === "g2plot" ? plan.plotType : undefined,
    plotOptions,
    plan.kind === "g2plot" && !plan.empty,
    interactionHandlers,
  );

  useEmbeddedChartLiveResize(fill && !plan.empty, containerRef, resize);

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
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={cn(fill ? "min-h-0 flex-1" : "w-full")}
        data-testid="antv-g2plot-chart"
        style={fill ? undefined : { height, width: width ?? "100%" }}
      />
    </div>
  );
}

export const AntvG2PlotView = memo(AntvG2PlotViewInner);
