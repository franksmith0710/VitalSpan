import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import { embeddedSizeChanged, readChartPaintSize } from "@/components/charts/engine/embeddedContainerSize";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { setDepthVisual } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { disposeD3Renderer, runD3Renderer } from "@/components/charts/engine/d3/core/d3RendererSession";
import { renderD3Chart } from "@/components/charts/engine/d3/renderDispatch";
import { buildD3DispatchPayload } from "@/components/charts/engine/d3/views/buildRenderConfig";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
} from "@/components/charts/engine/buildDatasetEncoding";
import {
  resolveGeoMapFallbackBanner,
  type GeoMapRenderEngine,
} from "@/components/charts/engine/geo/geoMapRenderResult";
import { activeGeoEngine } from "@/components/charts/engine/geoEnginePort";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import { useElementSize } from "@/hooks/useElementSize";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { useGeoMapLevel } from "@/hooks/useGeoMapLevel";
import { useChartVisualScale } from "@/hooks/useChartVisualScale";
import { VIZ_WHEEL_ZOOM_SURFACE_ATTR } from "@/components/dashboard/pixelCanvas/pixelCanvasWheelScroll";
import { readChartDeStyle, readChartGeoStyle } from "@/lib/chartDeStyle";
import { cn } from "@/lib/utils";

type PaintMode = "data" | "live" | "commit";

const LIVE_RESIZE_THROTTLE_MS = 100;

function D3GeoMapViewInner(props: ChartEngineViewProps) {
  const {
    viewModel,
    style,
    chartConfig,
    fill = false,
    height = 180,
    width,
    ariaLabel,
    mapPlaceholderHint,
    mapDrillError,
    drillStack = [],
  } = props;

  const isThreeMap = viewModel.chartType === "map-3d";

  const geoRoamEnabled = useMemo(() => {
    if (!chartConfig) return true;
    return readChartGeoStyle(readChartDeStyle(chartConfig)).roam !== false;
  }, [chartConfig]);

  const plan = useMemo(() => {
    const base = buildChartRenderPlan(viewModel);
    return applyChartStyleChain(base, style, chartConfig);
  }, [viewModel, style, chartConfig]);

  const { rows: capped, truncated } = useMemo(
    () => capRows(viewModel.dataset.rows, ADVANCED_CHART_ROW_CAP),
    [viewModel.dataset.rows],
  );
  const columns = viewModel.dataset.columns;

  const mapDrillEnabled = Boolean(chartConfig);
  const { context: geoMapLevel, loading: geoMapLoading } = useGeoMapLevel({
    enabled: mapDrillEnabled,
    config: chartConfig,
    drillStack,
  });

  const planWithGeo = useMemo(
    () => ({
      ...plan,
      options: {
        ...plan.options,
        mapId: geoMapLevel.mapId,
        knownRegionNames: geoMapLevel.knownRegionNames,
        drillDepth: geoMapLevel.drillDepth,
        levelLabel: geoMapLevel.levelLabel,
      },
    }),
    [plan, geoMapLevel.mapId, geoMapLevel.knownRegionNames, geoMapLevel.drillDepth, geoMapLevel.levelLabel],
  );

  const spec = useMemo(() => chartViewModelToRenderSpec(viewModel), [viewModel]);
  const geoMatchStats = useMemo(() => {
    const regionField = spec.encoding.dimensions[0]?.field;
    if (!regionField) return null;
    return activeGeoEngine.analyzeMatch(
      capped,
      columns,
      regionField,
      geoMapLevel.knownRegionNames,
      geoMapLevel.drillDepth === 0,
    );
  }, [spec, capped, columns, geoMapLevel]);

  const geoMatchWarning =
    geoMatchStats && geoMatchStats.total > 0 && geoMatchStats.matched < geoMatchStats.total
      ? `有 ${geoMatchStats.total - geoMatchStats.matched} 条无法匹配地图区域`
      : null;
  const geoAssetWarning = geoMapLevel.missingAsset ?? mapDrillError ?? null;
  const showPlaceholderHint = capped.length === 0 && Boolean(mapPlaceholderHint);

  const playing = usePixelShapePlayer();
  const visualScale = useChartVisualScale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastMeasureRef = useRef({ width: 0, height: 0 });
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderGenRef = useRef(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderEngine, setRenderEngine] = useState<GeoMapRenderEngine | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [threeLoading, setThreeLoading] = useState(false);

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

  const applyRenderMeta = useCallback(
    (engine: GeoMapRenderEngine | null, reason?: string | null) => {
      setRenderEngine(engine);
      setFallbackReason(reason ?? null);
    },
    [],
  );

  const measureAndRender = useCallback(
    (mode: PaintMode, force = false) => {
      if (geoMapLoading) return;
      const el = containerRef.current;
      if (!el || planWithGeo.kind !== "d3" || planWithGeo.empty) return;

      const paint = readChartPaintSize(el, {
        fill,
        visualScale,
        layoutFootprint: props.layoutFootprint,
        width,
        height,
        observedWidth: size.width,
      });
      if (!paint) return;
      const { width: chartWidth, height: chartHeight } = paint;
      const next = { width: chartWidth, height: chartHeight };
      if (next.width <= 0 || next.height <= 0) return;
      if (!force && !embeddedSizeChanged(next, lastMeasureRef.current)) return;
      lastMeasureRef.current = next;
      setDepthVisual(style.depthVisual ?? "off");

      const suppressAnim = mode === "live" || mode === "commit";
      setChartAnimationSuppressed(suppressAnim);

      const payload = buildD3DispatchPayload(props, planWithGeo, chartWidth, chartHeight);
      if (!payload || payload.kind !== "geo") {
        if (mode !== "live") setChartAnimationSuppressed(false);
        return;
      }

      const gen = ++renderGenRef.current;

      const runD3 = () => {
        runD3Renderer(el, () => renderD3Chart(el, planWithGeo, payload));
        applyRenderMeta(null, null);
        setRenderError(null);
        if (mode !== "live") setChartAnimationSuppressed(false);
      };

      if (!isThreeMap) {
        setThreeLoading(false);
        try {
          runD3();
        } catch (err) {
          setRenderError(err instanceof Error ? err.message : "地图渲染失败");
          if (mode !== "live") setChartAnimationSuppressed(false);
        }
        return;
      }

      setThreeLoading(true);
      void import("@/components/charts/engine/three/renderThreeChoropleth")
        .then(async ({ renderThreeChoroplethChart }) => {
          if (gen !== renderGenRef.current) return;
          try {
            if (gen !== renderGenRef.current) return;
            let disposed = false;
            let disposeFn: (() => void) | undefined;
            runD3Renderer(el, () => {
              if (gen !== renderGenRef.current) {
                return () => undefined;
              }
              void renderThreeChoroplethChart(el, payload.config)
                .then((result) => {
                  if (gen !== renderGenRef.current || disposed) {
                    result.dispose();
                    return;
                  }
                  disposeFn = result.dispose;
                  applyRenderMeta(result.engine, result.fallbackReason ?? null);
                  setRenderError(null);
                })
                .catch((err) => {
                  if (gen !== renderGenRef.current || disposed) return;
                  setRenderError(err instanceof Error ? err.message : "3D 地图渲染失败");
                  applyRenderMeta(null, null);
                })
                .finally(() => {
                  if (gen !== renderGenRef.current) return;
                  setThreeLoading(false);
                  if (mode !== "live") setChartAnimationSuppressed(false);
                });
              return () => {
                disposed = true;
                disposeFn?.();
              };
            });
          } catch (err) {
            setRenderError(err instanceof Error ? err.message : "3D 地图渲染失败");
            applyRenderMeta(null, null);
            setThreeLoading(false);
            if (mode !== "live") setChartAnimationSuppressed(false);
          }
        })
        .catch(() => {
          if (gen !== renderGenRef.current) return;
          setRenderError("3D 地图模块加载失败");
          setThreeLoading(false);
          applyRenderMeta(null, null);
          if (mode !== "live") setChartAnimationSuppressed(false);
        });
    },
    [
      isThreeMap,
      geoMapLoading,
      planWithGeo,
      fill,
      width,
      height,
      size.width,
      size.height,
      props,
      style.depthVisual,
      visualScale,
      props.layoutFootprint?.width,
      props.layoutFootprint?.height,
      applyRenderMeta,
    ],
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
    lastMeasureRef.current = { width: 0, height: 0 };
    measureAndRender("data", true);
  }, [geoMapLevel.mapId, measureAndRender]);

  useEffect(() => {
    measureAndRender("data", true);
  }, [measureAndRender]);

  useEffect(() => {
    if (!fill || plan.empty) return;
    if (!playing) measureAndRender("commit", false);
  }, [fill, plan.empty, playing, measureAndRender]);

  useEffect(() => {
    if (!props.layoutFootprint) return;
    measureAndRender("commit", true);
  }, [props.layoutFootprint?.width, props.layoutFootprint?.height, measureAndRender]);

  useEffect(() => {
    if (!fill || plan.empty || playing) return;
    measureAndRender("commit", true);
  }, [visualScale, fill, plan.empty, playing, measureAndRender]);

  useEffect(() => {
    renderGenRef.current += 1;
    setThreeLoading(false);
    applyRenderMeta(null, null);
    disposeD3Renderer(containerRef.current);
  }, [viewModel.chartType, applyRenderMeta]);

  useEffect(() => {
    return () => {
      if (liveTimerRef.current !== null) clearTimeout(liveTimerRef.current);
      renderGenRef.current += 1;
      disposeD3Renderer(containerRef.current);
      setChartAnimationSuppressed(false);
    };
  }, []);

  const showFallbackBanner = isThreeMap && renderEngine === "d3-fallback";

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

  if (plan.empty) {
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
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条
        </p>
      ) : null}
      {renderError ? (
        <p role="alert" className="mb-2 shrink-0 text-theme-sm text-error-600 dark:text-error-400">
          {renderError}
        </p>
      ) : null}
      {showFallbackBanner ? (
        <p
          role="status"
          className={cn(
            "shrink-0 rounded-md bg-warning-500/10 px-2 py-1 text-theme-xs text-warning-700 dark:text-warning-400",
            fill ? "pointer-events-none absolute inset-x-2 top-2 z-[2]" : "mb-2",
          )}
          data-fallback-reason={fallbackReason ?? undefined}
        >
          {resolveGeoMapFallbackBanner(fallbackReason ?? undefined)}
          {import.meta.env.DEV && fallbackReason ? (
            <span className="ml-1 opacity-70">({fallbackReason})</span>
          ) : null}
        </p>
      ) : null}
      {geoMatchWarning || geoAssetWarning ? (
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
      <div className={cn("relative", fill ? "min-h-0 flex-1" : "w-full")}>
        {geoMapLoading || threeLoading ? (
          <p
            role="status"
            className="pointer-events-none absolute inset-x-2 top-2 z-[2] text-theme-xs text-gray-500 dark:text-gray-400"
          >
            {threeLoading ? "正在加载 3D 地图…" : `正在加载${geoMapLevel.levelLabel}地图…`}
          </p>
        ) : null}
        <div
          ref={setContainerRef}
          className={cn("relative h-full w-full")}
          data-testid={isThreeMap ? "three-map-chart" : "d3-map-chart"}
          data-render-engine={isThreeMap ? (renderEngine ?? "pending") : undefined}
          {...(geoRoamEnabled ? { [VIZ_WHEEL_ZOOM_SURFACE_ATTR]: "true" } : {})}
          style={fill ? undefined : { height, width: width ?? "100%" }}
        />
        {showPlaceholderHint ? (
          <p className="dw-hint pointer-events-none absolute inset-x-0 bottom-[10%] text-center" role="status">
            {mapPlaceholderHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const D3GeoMapView = memo(D3GeoMapViewInner);
