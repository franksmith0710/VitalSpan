import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import { embeddedSizeChanged, readChartPaintSize } from "@/components/charts/engine/embeddedContainerSize";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { setDepthVisual } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { disposeD3Renderer, runD3Renderer } from "@/components/charts/engine/d3/core/d3RendererSession";
import {
  beginPresentationPaint,
  endPresentationPaint,
  type ChartPresentationPaintContext,
} from "@/components/charts/engine/d3/core/chartPresentationScale";
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
import { buildGeoMapContentKey } from "@/components/charts/engine/geo/geoMapContentKey";
import { GeoMapOverlayHint } from "@/components/charts/engine/geo/GeoMapOverlayHint";
import { loadOfflineGeoMap } from "@/components/charts/engine/geo/geoMapLevels";
import { VS_REGIONS_MAP_ID, withMapLoadTimeout } from "@/components/charts/engine/geo/geoConstants";
import { activeGeoEngine } from "@/components/charts/engine/geoEnginePort";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import { useElementSize } from "@/hooks/useElementSize";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { useGeoMapLevel, isGeoMapLevelReady } from "@/hooks/useGeoMapLevel";
import { useChartVisualScale } from "@/hooks/useChartVisualScale";
import { useDataScreenViewportTransforming } from "@/components/dashboard/screen/dataScreenVisualScaleContext";
import { capChartPaintSize } from "@/lib/dashboardEditChartPerf";
import { VIZ_WHEEL_ZOOM_SURFACE_ATTR } from "@/components/dashboard/pixelCanvas/pixelCanvasWheelScroll";
import { readChartDeStyle, readChartGeoStyle, readChartGeo3dStyle } from "@/lib/chartDeStyle";
import { readChartGeoAreaMappingLookup, buildAreaMappingContentSig } from "@/lib/chartGeoAreaMapping";
import {
  buildGeo3dStructureContentSig,
  buildGeo3dVisualContentSig,
} from "@/components/charts/engine/three/geo3dStyleContentSig";
import { buildGeoMapStyleContentSig } from "@/components/charts/engine/geo/geoRegionFillStyle";
import { cn } from "@/lib/utils";

type PaintMode = "data" | "live" | "commit";

const LIVE_RESIZE_THROTTLE_MS = 100;

function geoAssetMissingMessage(mapId: string): string {
  const trimmed = mapId?.trim() || VS_REGIONS_MAP_ID;
  return trimmed === VS_REGIONS_MAP_ID
    ? "离线地图资产缺失，无法渲染"
    : `下钻地图资产未就绪（${trimmed}），请返回上一级或稍后重试`;
}

type ThreeMapApi = {
  structureKey: string;
  resize: (width: number, height: number) => boolean;
  patchGeo3dStyle?: (input: {
    geo3dStyle?: ReturnType<typeof readChartGeo3dStyle>;
    geoStyle?: ReturnType<typeof readChartGeoStyle>;
    isDark?: boolean;
  }) => boolean | Promise<boolean>;
};

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
    onPaintReady,
    paintMaxEdge,
    chartDataRevision,
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
  const { context: geoMapLevel, loading: geoMapLoading, version: geoMapVersion } = useGeoMapLevel({
    enabled: mapDrillEnabled,
    config: chartConfig,
    drillStack,
  });

  const geoMapLevelReady = useMemo(
    () => isGeoMapLevelReady(drillStack, geoMapLevel, geoMapLoading),
    [drillStack, geoMapLevel, geoMapLoading],
  );

  const planWithGeo = useMemo(
    () => ({
      ...plan,
      options: {
        ...plan.options,
        mapId: geoMapLevel.mapId,
        knownRegionNames: geoMapLevel.knownRegionNames,
        drillDepth: geoMapLevel.drillDepth,
      },
    }),
    [plan, geoMapLevel.mapId, geoMapLevel.knownRegionNames, geoMapLevel.drillDepth],
  );

  const areaMapping = useMemo(
    () => (chartConfig ? readChartGeoAreaMappingLookup(readChartDeStyle(chartConfig)) : undefined),
    [chartConfig],
  );

  const areaMappingSig = useMemo(
    () => buildAreaMappingContentSig(areaMapping),
    [areaMapping],
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
      geoMapLevel.drillDepth,
      areaMapping,
    );
  }, [spec, capped, columns, geoMapLevel, areaMapping]);

  const geoMatchWarning =
    geoMatchStats && geoMatchStats.total > 0 && geoMatchStats.matched < geoMatchStats.total
      ? `有 ${geoMatchStats.total - geoMatchStats.matched} 条无法匹配地图区域`
      : null;
  const geoAssetWarning =
    geoMapLevel.missingAsset ?? (drillStack.length > 0 ? null : mapDrillError) ?? null;
  const showPlaceholderHint = capped.length === 0 && Boolean(mapPlaceholderHint);

  const playing = usePixelShapePlayer();
  const visualScale = useChartVisualScale();
  const viewportTransforming = useDataScreenViewportTransforming();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastMeasureRef = useRef({ width: 0, height: 0 });
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measureRetryRef = useRef(0);
  const paintReadySentRef = useRef(false);
  const renderGenRef = useRef(0);
  const threePendingGenRef = useRef(0);
  const threeApiRef = useRef<ThreeMapApi | null>(null);
  const lastVisualSigRef = useRef("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderEngine, setRenderEngine] = useState<GeoMapRenderEngine | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [threeLoading, setThreeLoading] = useState(false);
  const [mapAssetLoading, setMapAssetLoading] = useState(false);
  const [mapRetryToken, setMapRetryToken] = useState(0);

  const { ref: sizeRef, size } = useElementSize<HTMLDivElement>({
    enabled: !fill,
    debounceMs: LIVE_RESIZE_THROTTLE_MS,
    paused: playing,
  });

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (node && props.instanceKey) {
        node.dataset.widgetId = props.instanceKey;
      }
      sizeRef(node);
    },
    [sizeRef, props.instanceKey],
  );

  const regionField = spec.encoding.dimensions[0]?.field;
  const geoStyleStructureSig = useMemo(() => {
    if (!chartConfig) return "";
    const de = readChartDeStyle(chartConfig);
    const geo = readChartGeoStyle(de);
    if (isThreeMap) {
      return buildGeo3dStructureContentSig(readChartGeo3dStyle(de), geo);
    }
    return buildGeoMapStyleContentSig(geo, {
      paletteOpacity: de.paletteOpacity,
      paletteId: de.paletteId,
      paletteColors: de.paletteColors,
      chartColors: style.chartColors,
    });
  }, [chartConfig, isThreeMap, style.chartColors]);

  const geoStyleVisualSig = useMemo(() => {
    if (!chartConfig || !isThreeMap) return "";
    const de = readChartDeStyle(chartConfig);
    const geo = readChartGeoStyle(de);
    return buildGeo3dVisualContentSig(readChartGeo3dStyle(de), geo);
  }, [chartConfig, isThreeMap]);

  const contentKey = useMemo(
    () =>
      buildGeoMapContentKey({
        chartType: viewModel.chartType,
        mapId: geoMapLevel.mapId,
        drillDepth: geoMapLevel.drillDepth,
        drillStack,
        rowCount: capped.length,
        regionField,
        rowsSample: capped as Record<string, unknown>[],
        depthVisual: style.depthVisual,
        isDark: style.isDark,
        renderTier: props.geo3dRenderTier ?? "full",
        geo3dStyleSig: geoStyleStructureSig,
        areaMappingSig,
        dataRevision: chartDataRevision,
      }),
    [
      viewModel.chartType,
      geoMapLevel.mapId,
      geoMapLevel.drillDepth,
      drillStack,
      capped,
      regionField,
      style.depthVisual,
      style.isDark,
      props.geo3dRenderTier,
      geoStyleStructureSig,
      areaMappingSig,
      chartDataRevision,
    ],
  );

  const applyRenderMeta = useCallback(
    (engine: GeoMapRenderEngine | null, reason?: string | null) => {
      setRenderEngine(engine);
      setFallbackReason(reason ?? null);
    },
    [],
  );

  const notifyPaintReady = useCallback(() => {
    if (paintReadySentRef.current) return;
    paintReadySentRef.current = true;
    onPaintReady?.();
  }, [onPaintReady]);

  const clearThreePending = useCallback((gen: number) => {
    if (threePendingGenRef.current !== gen) return;
    threePendingGenRef.current = 0;
    setThreeLoading(false);
    setMapAssetLoading(false);
  }, []);

  const handleMapRetry = useCallback(() => {
    setRenderError(null);
    threeApiRef.current = null;
    lastMeasureRef.current = { width: 0, height: 0 };
    setMapRetryToken((token) => token + 1);
  }, []);

  const readPaintSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    const raw = readChartPaintSize(el, {
      fill,
      visualScale,
      layoutFootprint: props.layoutFootprint,
      width,
      height,
      observedWidth: size.width,
    });
    if (!raw) return null;
    return capChartPaintSize(raw, paintMaxEdge);
  }, [
    fill,
    visualScale,
    props.layoutFootprint,
    width,
    height,
    size.width,
    paintMaxEdge,
  ]);

  const tryThreeResize = useCallback(
    (mode: PaintMode): boolean => {
      if (!isThreeMap || threeLoading) return false;
      const api = threeApiRef.current;
      if (!api || api.structureKey !== contentKey) return false;
      const paint = readPaintSize();
      if (!paint) return false;
      const next = { width: paint.width, height: paint.height };
      if (next.width <= 0 || next.height <= 0) return false;
      if (!api.resize(next.width, next.height)) return false;
      lastMeasureRef.current = next;
      if (mode !== "live") setChartAnimationSuppressed(false);
      return true;
    },
    [isThreeMap, threeLoading, contentKey, readPaintSize],
  );

  const measureAndRender = useCallback(
    (mode: PaintMode, force = false) => {
      if (geoMapLoading || !geoMapLevelReady) return;
      const el = containerRef.current;
      if (!el || planWithGeo.kind !== "d3" || planWithGeo.empty) return;

      const paint = readPaintSize();
      if (!paint) {
        if (measureRetryRef.current < 12) {
          measureRetryRef.current += 1;
          requestAnimationFrame(() => measureAndRender(mode, force));
        } else {
          notifyPaintReady();
        }
        return;
      }
      const { width: chartWidth, height: chartHeight } = paint;
      const next = { width: chartWidth, height: chartHeight };
      if (next.width <= 0 || next.height <= 0) {
        if (measureRetryRef.current < 12) {
          measureRetryRef.current += 1;
          requestAnimationFrame(() => measureAndRender(mode, force));
        } else {
          notifyPaintReady();
        }
        return;
      }
      measureRetryRef.current = 0;

      if (
        isThreeMap &&
        threeApiRef.current?.structureKey === contentKey &&
        (mode === "live" || mode === "commit")
      ) {
        tryThreeResize(mode);
        return;
      }

      if (
        isThreeMap &&
        threeApiRef.current?.structureKey === contentKey &&
        !force &&
        embeddedSizeChanged(next, lastMeasureRef.current)
      ) {
        if (tryThreeResize(mode)) return;
        if (threeLoading && mode !== "data") return;
      }

      if (!force && !embeddedSizeChanged(next, lastMeasureRef.current)) return;
      lastMeasureRef.current = next;
      setDepthVisual(style.depthVisual ?? "off");

      const suppressAnim = mode === "live" || mode === "commit";
      setChartAnimationSuppressed(suppressAnim);

      const presentationPaint: ChartPresentationPaintContext = {
        chartWidth,
        chartHeight,
        visualScale,
        renderTier: props.geo3dRenderTier,
      };
      beginPresentationPaint(presentationPaint);

      const payload = buildD3DispatchPayload(props, planWithGeo, chartWidth, chartHeight, {
        visualScale,
        renderTier: props.geo3dRenderTier,
      });
      if (!payload || payload.kind !== "geo") {
        endPresentationPaint();
        if (mode !== "live") setChartAnimationSuppressed(false);
        notifyPaintReady();
        return;
      }

      const gen = ++renderGenRef.current;
      threeApiRef.current = null;

      const runD3 = () => {
        try {
          runD3Renderer(el, () => renderD3Chart(el, planWithGeo, payload));
          applyRenderMeta(null, null);
          setRenderError(null);
          notifyPaintReady();
        } finally {
          endPresentationPaint();
          if (mode !== "live") setChartAnimationSuppressed(false);
        }
      };

      if (!isThreeMap) {
        setThreeLoading(false);
        setMapAssetLoading(true);
        const mapIdToLoad = geoMapLevel.mapId;
        void withMapLoadTimeout(loadOfflineGeoMap(mapIdToLoad))
          .then((geo) => {
            if (gen !== renderGenRef.current) return;
            if (!geo?.features?.length) {
              endPresentationPaint();
              setRenderError(geoAssetMissingMessage(mapIdToLoad));
              if (mode !== "live") setChartAnimationSuppressed(false);
              notifyPaintReady();
              return;
            }
            try {
              runD3();
            } catch (err) {
              endPresentationPaint();
              setRenderError(err instanceof Error ? err.message : "地图渲染失败");
              if (mode !== "live") setChartAnimationSuppressed(false);
              notifyPaintReady();
            }
          })
          .catch((err) => {
            if (gen !== renderGenRef.current) return;
            endPresentationPaint();
            setRenderError(err instanceof Error ? err.message : "地图资产加载失败");
            if (mode !== "live") setChartAnimationSuppressed(false);
            notifyPaintReady();
          })
          .finally(() => {
            if (gen !== renderGenRef.current) return;
            setMapAssetLoading(false);
          });
        return;
      }

      setThreeLoading(true);
      setMapAssetLoading(true);
      threePendingGenRef.current = gen;
      const renderStructureKey = contentKey;

      const runThreeRender = async () => {
        const { renderThreeChoroplethChart } = await import(
          "@/components/charts/engine/three/renderThreeChoropleth"
        );
        if (gen !== renderGenRef.current) return;

        await new Promise<void>((resolve, reject) => {
          let disposed = false;
          let disposeFn: (() => void) | undefined;
          runD3Renderer(el, () => {
            if (gen !== renderGenRef.current) {
              reject(new Error("cancelled"));
              return () => undefined;
            }
            void renderThreeChoroplethChart(el, payload.config)
              .then((result) => {
                if (gen !== renderGenRef.current || disposed) {
                  result.dispose();
                  reject(new Error("cancelled"));
                  return;
                }
                disposeFn = result.dispose;
                if (result.engine === "three" && result.resize) {
                  threeApiRef.current = {
                    structureKey: renderStructureKey,
                    resize: result.resize,
                    patchGeo3dStyle: result.patchGeo3dStyle,
                  };
                  lastVisualSigRef.current = geoStyleVisualSig;
                  const paint = readPaintSize();
                  if (paint && paint.width > 0 && paint.height > 0) {
                    result.resize(paint.width, paint.height);
                  }
                }
                applyRenderMeta(result.engine, result.fallbackReason ?? null);
                setRenderError(null);
                notifyPaintReady();
                resolve();
              })
              .catch(reject);
            return () => {
              disposed = true;
              disposeFn?.();
            };
          });
        });
      };

      void withMapLoadTimeout(runThreeRender())
        .catch((err) => {
          if (gen !== renderGenRef.current) return;
          if (err instanceof Error && err.message === "cancelled") return;
          setRenderError(err instanceof Error ? err.message : "3D 地图渲染失败");
          applyRenderMeta(null, null);
          notifyPaintReady();
        })
        .finally(() => {
          clearThreePending(gen);
          if (gen !== renderGenRef.current) return;
          if (mode !== "live") setChartAnimationSuppressed(false);
        });
    },
    [
      isThreeMap,
      geoMapLoading,
      geoMapLevelReady,
      geoMapLevel.mapId,
      planWithGeo,
      contentKey,
      readPaintSize,
      tryThreeResize,
      props,
      style.depthVisual,
      applyRenderMeta,
      clearThreePending,
      geoStyleVisualSig,
      notifyPaintReady,
    ],
  );

  const measureAndRenderRef = useRef(measureAndRender);
  measureAndRenderRef.current = measureAndRender;

  const onLiveResize = useCallback(() => {
    setChartAnimationSuppressed(true);
    if (isThreeMap && threeApiRef.current) {
      tryThreeResize("live");
      return;
    }
    if (isThreeMap && tryThreeResize("live")) return;
    // 2D choropleth：SVG viewBox + 100% 随容器 CSS 缩放，交互期跳过全量重绘
    if (!isThreeMap) {
      const paint = readPaintSize();
      if (paint) lastMeasureRef.current = paint;
      return;
    }
    if (liveTimerRef.current !== null) return;
    liveTimerRef.current = setTimeout(() => {
      liveTimerRef.current = null;
      measureAndRender("live");
    }, LIVE_RESIZE_THROTTLE_MS);
  }, [isThreeMap, tryThreeResize, measureAndRender, readPaintSize]);

  const onCommitResize = useCallback(() => {
    if (liveTimerRef.current !== null) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    setChartAnimationSuppressed(false);
    if (isThreeMap) {
      if (tryThreeResize("commit")) return;
      measureAndRender("commit", true);
      return;
    }
    measureAndRender("commit", true);
  }, [isThreeMap, tryThreeResize, measureAndRender]);

  useEmbeddedChartLiveResize(fill && !plan.empty, containerRef, onLiveResize, onCommitResize);

  useEffect(() => {
    if (geoMapLoading || !geoMapLevelReady) return;
    if (!fill && (size.width <= 0 || size.height <= 0)) return;

    const tier = props.geo3dRenderTier ?? "full";
    const debounceMs = tier === "full" || tier === "thumbnail" ? 0 : 300;

    const runRebuild = () => {
      threeApiRef.current = null;
      lastMeasureRef.current = { width: 0, height: 0 };
      measureAndRenderRef.current("data", true);
    };

    if (debounceMs <= 0) {
      runRebuild();
      return;
    }

    const timer = window.setTimeout(runRebuild, debounceMs);
    return () => window.clearTimeout(timer);
  }, [
    contentKey,
    geoMapLoading,
    geoMapVersion,
    geoMapLevelReady,
    fill,
    size.width,
    size.height,
    mapRetryToken,
    props.geo3dRenderTier,
  ]);

  useEffect(() => {
    measureAndRenderRef.current("commit", true);
  }, [paintMaxEdge]);

  useEffect(() => {
    if (!isThreeMap || !chartConfig || !geoStyleVisualSig) return;
    if (geoStyleVisualSig === lastVisualSigRef.current) return;
    const api = threeApiRef.current;
    if (!api?.patchGeo3dStyle || threeLoading) return;
    if (api.structureKey !== contentKey) return;

    const de = readChartDeStyle(chartConfig);
    const nextVisualSig = geoStyleVisualSig;
    lastVisualSigRef.current = nextVisualSig;

    void Promise.resolve(
      api.patchGeo3dStyle({
        geo3dStyle: readChartGeo3dStyle(de),
        geoStyle: readChartGeoStyle(de),
        isDark: style.isDark,
      }),
    ).then((ok) => {
      if (ok === false) {
        lastVisualSigRef.current = "";
        threeApiRef.current = null;
        measureAndRenderRef.current("data", true);
      }
    });
  }, [
    geoStyleVisualSig,
    isThreeMap,
    chartConfig,
    contentKey,
    threeLoading,
    style.isDark,
  ]);

  useEffect(() => {
    if (!fill || plan.empty) return;
    if (!playing) onCommitResize();
  }, [fill, plan.empty, playing, onCommitResize]);

  useEffect(() => {
    if (!props.layoutFootprint || playing) return;
    onCommitResize();
  }, [props.layoutFootprint?.width, props.layoutFootprint?.height, onCommitResize, playing]);

  useEffect(() => {
    if (!fill || plan.empty || playing || viewportTransforming) return;
    onCommitResize();
  }, [visualScale, fill, plan.empty, playing, viewportTransforming, onCommitResize]);

  useEffect(() => {
    renderGenRef.current += 1;
    threeApiRef.current = null;
    threePendingGenRef.current = 0;
    setThreeLoading(false);
    setMapAssetLoading(false);
    paintReadySentRef.current = false;
    applyRenderMeta(null, null);
    disposeD3Renderer(containerRef.current);
  }, [viewModel.chartType, applyRenderMeta]);

  useEffect(() => {
    return () => {
      if (liveTimerRef.current !== null) clearTimeout(liveTimerRef.current);
      renderGenRef.current += 1;
      threeApiRef.current = null;
      threePendingGenRef.current = 0;
      setThreeLoading(false);
      setMapAssetLoading(false);
      disposeD3Renderer(containerRef.current);
      setChartAnimationSuppressed(false);
    };
  }, []);

  const showFallbackBanner =
    isThreeMap && (renderEngine === "d3-fallback" || (renderEngine === "three" && fallbackReason));

  const overlayHint = useMemo(() => {
    if (showPlaceholderHint) return null;
    if (renderError) return { message: renderError, tone: "error" as const };
    if (geoAssetWarning) return { message: geoAssetWarning, tone: "warning" as const };
    if (geoMatchWarning) return { message: geoMatchWarning, tone: "warning" as const };
    if (showFallbackBanner) {
      const message =
        resolveGeoMapFallbackBanner(fallbackReason ?? undefined) +
        (import.meta.env.DEV && fallbackReason ? ` (${fallbackReason})` : "");
      return { message, tone: "warning" as const };
    }
    if (truncated) {
      return {
        message: `数据量较大，已采样显示前 ${ADVANCED_CHART_ROW_CAP} 条`,
        tone: "info" as const,
      };
    }
    return null;
  }, [
    showPlaceholderHint,
    renderError,
    geoAssetWarning,
    geoMatchWarning,
    showFallbackBanner,
    fallbackReason,
    truncated,
  ]);

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
    <div className={cn("w-full", fill ? "absolute inset-0" : "min-h-[120px]")} aria-label={ariaLabel}>
      <div
        className={cn("relative", fill ? "h-full min-h-0" : "w-full")}
        style={fill ? undefined : { height, width: width ?? "100%" }}
      >
        {(geoMapLoading || threeLoading || mapAssetLoading) ? (
          <p
            role="status"
            className="pointer-events-none absolute right-2 top-2 z-[1] text-theme-xs text-gray-500/80 dark:text-gray-400/80"
          >
            {`正在加载${geoMapLevel.levelLabel}地图…`}
          </p>
        ) : null}
        <div
          ref={setContainerRef}
          className="relative h-full w-full"
          data-testid={isThreeMap ? "three-map-chart" : "d3-map-chart"}
          data-render-engine={isThreeMap ? (renderEngine ?? "pending") : undefined}
          {...(fill || geoRoamEnabled ? { [VIZ_WHEEL_ZOOM_SURFACE_ATTR]: "true" } : {})}
        />
        {overlayHint ? (
          <GeoMapOverlayHint
            data-testid="geo-map-overlay-hint"
            message={overlayHint.message}
            tone={overlayHint.tone}
            onRetry={renderError ? handleMapRetry : undefined}
          />
        ) : null}
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
