import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildAntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { renderD3LineChart, type D3LineDatum } from "@/components/charts/engine/d3/renderD3LineChart";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
} from "@/components/charts/engine/buildDatasetEncoding";
import { useElementSize } from "@/hooks/useElementSize";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { resolveChartSeriesColorItems } from "@/lib/chartSeriesColor";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import { readChartConditionalRules, readChartMarkLines } from "@/lib/chartDeFeatures";
import { cn } from "@/lib/utils";

function extractDrillValue(datum: D3LineDatum, xField: string): string {
  const value = datum[xField] ?? datum.__category__;
  return value != null && String(value) !== "" ? String(value) : "";
}

function D3LineViewInner(props: ChartEngineViewProps) {
  const {
    viewModel,
    style,
    chartConfig,
    fill = false,
    height = 180,
    width,
    ariaLabel,
    onInteraction,
    onJumpClick,
    isDark,
  } = props;

  const plan = useMemo(() => {
    const base = buildAntvRenderPlan(viewModel);
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

  const rerender = useCallback(() => {
    const el = containerRef.current;
    if (!el || plan.kind !== "d3" || plan.empty || capped.length === 0) return;

    const options = plan.options;
    const xField = String(options.xField ?? "__category__");
    const yField = String(options.yField ?? "__value__");
    const seriesField = options.seriesField ? String(options.seriesField) : undefined;
    const data = (options.data as D3LineDatum[]) ?? [];

    const chartWidth = fill ? el.clientWidth : (width ?? size.width ?? el.clientWidth);
    const chartHeight = fill ? el.clientHeight : height;

    const paletteItems =
      chartConfig && style.deFeatures?.conditionalRules?.length === 0
        ? resolveChartSeriesColorItems(
            chartConfig,
            style.deStyle.paletteId,
            readChartDeStyle(chartConfig).seriesColor ?? style.deStyle.seriesColor,
          )
        : [];
    const colors =
      paletteItems.length > 0
        ? paletteItems.map((item) => item.color)
        : style.chartColors.length > 0
          ? style.chartColors
          : ["#465fff"];

    renderD3LineChart(el, {
      width: Math.max(0, chartWidth),
      height: Math.max(0, chartHeight),
      data,
      xField,
      yField,
      seriesField,
      smooth: Boolean(options.smooth),
      isHorizontal: Boolean(options.isHorizontal),
      colors,
      theme: getAntvThemeTokens(isDark ? "dark" : style.scheme),
      showLabel: style.showLabel,
      showTooltip: style.showTooltip,
      showLegend: !style.shellLegend && style.deStyle.legend?.show !== false && Boolean(seriesField),
      labelFontSize: style.labelPresentation.fontSize,
      valueFormat: style.valueFormat,
      markLines: chartConfig ? readChartMarkLines(chartConfig) : style.deFeatures?.markLines,
      conditionalRules: chartConfig ? readChartConditionalRules(chartConfig) : style.deFeatures?.conditionalRules,
      onPointClick:
        onInteraction || onJumpClick
          ? (datum) => {
              if (onJumpClick) {
                onJumpClick();
                return;
              }
              const value = extractDrillValue(datum, xField);
              if (value) onInteraction?.({ kind: "drill", value, label: value });
            }
          : undefined,
    });
  }, [
    plan,
    capped.length,
    fill,
    width,
    height,
    size.width,
    size.height,
    style,
    chartConfig,
    isDark,
    onInteraction,
    onJumpClick,
  ]);

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
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条
        </p>
      ) : null}
      <div
        ref={setContainerRef}
        className={cn("relative", fill ? "min-h-0 flex-1" : "w-full")}
        data-testid="d3-line-chart"
        style={fill ? undefined : { height, width: width ?? "100%" }}
      />
    </div>
  );
}

export const D3LineView = memo(D3LineViewInner);
