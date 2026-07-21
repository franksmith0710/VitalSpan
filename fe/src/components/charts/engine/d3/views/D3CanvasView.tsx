import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import { embeddedSizeChanged } from "@/components/charts/engine/embeddedContainerSize";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { setDepthVisual } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { disposeD3Renderer, runD3Renderer } from "@/components/charts/engine/d3/core/d3RendererSession";
import { renderD3Chart } from "@/components/charts/engine/d3/renderDispatch";
import { buildD3DispatchPayload } from "@/components/charts/engine/d3/views/buildRenderConfig";
import { d3ChartTestId } from "@/components/charts/engine/d3/views/d3TestId";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
} from "@/components/charts/engine/buildDatasetEncoding";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import { useElementSize } from "@/hooks/useElementSize";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { cn } from "@/lib/utils";

type PaintMode = "data" | "live" | "commit";

const LIVE_RESIZE_THROTTLE_MS = 100;

function resolvePaintWidth(
  el: HTMLElement,
  width: number | string | undefined,
  observedWidth: number,
  height: number,
): number {
  const fromProp = typeof width === "number" ? width : 0;
  const fromDom = el.clientWidth || observedWidth || fromProp;
  return fromDom > 0 ? fromDom : Math.max(320, height);
}

function D3CanvasViewInner(props: ChartEngineViewProps) {
  const { viewModel, style, chartConfig, fill = false, height = 180, width, ariaLabel } = props;

  const plan = useMemo(() => {
    const base = buildChartRenderPlan(viewModel);
    return applyChartStyleChain(base, style, chartConfig);
  }, [viewModel, style, chartConfig]);

  const { rows: capped, truncated } = useMemo(
    () => capRows(viewModel.dataset.rows, ADVANCED_CHART_ROW_CAP),
    [viewModel.dataset.rows],
  );

  const playing = usePixelShapePlayer();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastMeasureRef = useRef({ width: 0, height: 0 });
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const { ref: sizeRef, size } = useElementSize<HTMLDivElement>({
    enabled: !fill,
    debounceMs: LIVE_RESIZE_THROTTLE_MS,
    paused: playing,
  });

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      sizeRef(node);
    },
    [sizeRef],
  );

  const testId = d3ChartTestId(viewModel.chartType, plan.plotType);
  const mapEmptyOk = viewModel.chartType === "map" || viewModel.chartType === "map-3d";

  const measureAndRender = useCallback(
    (mode: PaintMode, force = false) => {
      const el = containerRef.current;
      if (!el || plan.kind !== "d3" || plan.empty) return;
      if (!mapEmptyOk && capped.length === 0) return;

      const chartWidth = fill ? el.clientWidth : resolvePaintWidth(el, width, size.width ?? 0, height);
      const chartHeight = fill ? el.clientHeight : height;
      const next = { width: Math.round(chartWidth), height: Math.round(chartHeight) };
      if (next.width <= 0 || next.height <= 0) return;
      if (!force && !embeddedSizeChanged(next, lastMeasureRef.current)) return;
      lastMeasureRef.current = next;

      el.dataset.vsIncremental = mode === "live" ? "true" : "false";
      setDepthVisual(style.depthVisual ?? "off");

      const suppressAnim = mode === "live" || mode === "commit";
      setChartAnimationSuppressed(suppressAnim);
      try {
        const payload = buildD3DispatchPayload(props, plan, chartWidth, chartHeight);
        if (!payload) return;
        runD3Renderer(el, () => renderD3Chart(el, plan, payload));
        setRenderError(null);
      } catch (err) {
        setRenderError(err instanceof Error ? err.message : "图表渲染失败");
      } finally {
        if (mode !== "live") setChartAnimationSuppressed(false);
      }
    },
    [plan, capped.length, fill, width, height, size.width, size.height, props, mapEmptyOk],
  );

  const onLiveResize = useCallback(() => {
    setChartAnimationSuppressed(true);
    if (liveTimerRef.current !== null) return;
    liveTimerRef.current = setTimeout(() => {
      liveTimerRef.current = null;
      measureAndRender("live");
    }, LIVE_RESIZE_THROTTLE_MS);
  }, [measureAndRender]);

  const onCommitResize = useCallback(() => {
    if (liveTimerRef.current !== null) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    setChartAnimationSuppressed(false);
    measureAndRender("commit", true);
  }, [measureAndRender]);

  useEmbeddedChartLiveResize(fill && !plan.empty, containerRef, onLiveResize, onCommitResize);

  useEffect(() => {
    measureAndRender("data", true);
  }, [measureAndRender]);

  useEffect(() => {
    if (!fill || plan.empty) return;
    if (!playing) {
      measureAndRender("commit", false);
    }
  }, [fill, plan.empty, playing, measureAndRender]);

  useEffect(() => {
    if (!props.layoutFootprint) return;
    measureAndRender("commit", true);
  }, [props.layoutFootprint?.width, props.layoutFootprint?.height, measureAndRender]);

  useEffect(() => {
    return () => {
      if (liveTimerRef.current !== null) clearTimeout(liveTimerRef.current);
      disposeD3Renderer(containerRef.current);
      setChartAnimationSuppressed(false);
    };
  }, []);

  if (plan.error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center px-3 text-center text-theme-sm text-error-600 dark:text-error-400",
          fill ? "absolute inset-0" : "min-h-[180px]",
        )}
        role="alert"
      >
        {plan.error}
      </div>
    );
  }

  if (plan.empty || (!mapEmptyOk && capped.length === 0)) {
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
    <div className={cn("w-full", fill ? "absolute inset-0 flex min-h-0 flex-col" : "min-h-[120px]")} aria-label={ariaLabel}>
      {truncated ? (
        <p role="status" className="mb-2 shrink-0 text-theme-sm text-warning-600 dark:text-warning-400">
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条</p>
      ) : null}
      {renderError ? (
        <p role="alert" className="mb-2 shrink-0 text-theme-sm text-error-600 dark:text-error-400">
          {renderError}
        </p>
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

export const D3CanvasView = memo(D3CanvasViewInner);
