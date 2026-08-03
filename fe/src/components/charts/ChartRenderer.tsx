import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildChartRenderModel } from "@/lib/buildChartRenderModel";
import { resolveChartConfigPhase } from "@/lib/chartConfigState";
import { isChartExecuteReady } from "@/lib/chartExecuteProbe";
import { DEFAULT_GEO_HEATMAP_PLACEHOLDER_HINT, DEFAULT_GEO_MAP_PLACEHOLDER_HINT, MAP_REGION_NAME_HINT, activeGeoEngine } from "@/components/charts/engine/geoEnginePort";
import {
  isCanvasChartType,
  isCartesianRowLimitedType,
  isGeoMapChartType,
  isLegacyTableChartType,
  isMatrixHeatmapChartType,
  type ChartViewConfig,
} from "@/lib/chartViewConfig";
import { migrateChartViewConfig } from "@/lib/migrateChartTypes";
import { resolveChartColors, applyChartColorsOpacity } from "@/lib/chartPalette";
import type { ColorScheme, DashboardStyleConfig, NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { readChartDeStyle, readChartGeoStyle, readChartLegendVisible, readChartLegendPosition, readChartPaletteOpacity, patchChartDeStyleNested } from "@/lib/chartDeStyle";
import {
  readChartLegendIcon,
  readChartLegendIconSize,
  readChartLegendOrient,
  readChartLegendHAlign,
  readChartLegendVAlign,
} from "@/lib/chartLegendPresentation";
import { resolveChartValueFormat } from "@/lib/chartValueFormat";
import type { ChartLegendItem } from "@/lib/chartLegendItems";
import { buildChartViewModel } from "@/components/charts/engine/buildChartViewModel";
import { buildStyleContext } from "@/components/charts/engine/buildStyleContext";
import { buildLegendSnapshot } from "@/components/charts/engine/legendSnapshot";
import { defaultGeo3dRenderTier } from "@/components/charts/engine/three/geo3dRuntime";
import { CanvasChartHost } from "@/components/charts/engine/CanvasChartHost";
import type { ChartInteractionEvent } from "@/components/charts/engine/types";
import {
  applyChartDrillPipeline,
  drillStackToFilterParameters,
  filterRowsByDrillStack,
  canDrillDeeper,
  getClickDrillField,
  getDrillChain,
  supportsChartDrillInteraction,
} from "@/lib/chartDrill";
import {
  applyMapChartDrillPipeline,
  getMapDrillClickField,
  preflightMapDrillClick,
} from "@/lib/geoMapDrill";
import { readManualGeoMapDrillStack } from "@/lib/geoMapRegionPicker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmbeddedChartTable } from "./adapters/EmbeddedChartTable";
import { ChartConfigPanel } from "./ChartConfigPanel";
import { ChartPanel } from "./ChartPanel";
import { CHART_EXECUTE_LIMIT, useChartExecute } from "./useChartExecute";
import { readChartDeTableStyle, mergeChartTableStyle, patchChartDeTableStyle } from "@/lib/chartDeTableStyle";
import {
  resolveEffectiveChartScheme,
  resolveTableThemeVars,
} from "@/lib/chartSurfaceTheme";
import { useElementSize } from "@/hooks/useElementSize";
import { useDashboardColorScheme } from "@/hooks/useDashboardColorScheme";
import { useDashboardGridPlayer } from "@/components/dashboard/dashboardGridPlayerContext";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import {
  dwState,
  dwStateError,
  dwStateWarning,
} from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import {
  embeddedBodyHeight,
  embeddedChartSurface,
  embeddedEmptyMessage,
  embeddedErrorMessage,
  embeddedStateMessage,
} from "./chartRendererEmbedded";
import { ChartDrillChrome } from "./ChartDrillChrome";
import { drillStackRevision, useChartDrill } from "./ChartDrillContext";
import { usePublishWidgetShellLegend } from "@/components/dashboard/pixelCanvas/widgetShellLegendContext";
import { supportsEmbeddedShellLegend } from "@/lib/chartInspectorCapabilities";
import {
  chartJumpIsConfigured,
  readChartJumpConfig,
  resolveChartJumpHref,
} from "@/lib/chartDeFeatures";

type ChartRendererProps = {
  config: ChartViewConfig;
  title?: string;
  mode?: "preview" | "config";
  embedded?: boolean;
  gridSpan?: { w: number; h: number };
  pixelSize?: { width: number; height: number };
  contentChromePx?: number;
  filterParameters?: Record<string, string>;
  executeKey?: string;
  queryLimit?: number;
  paletteId?: string;
  paletteColors?: string[];
  dashboardColorDefaults?: Pick<
    DashboardStyleConfig,
    | "paletteOpacity"
    | "seriesGradient"
    | "depthVisual"
    | "chartLabelShow"
    | "tooltipShow"
    | "chartLabelStyle"
    | "chartTooltipStyle"
    | "tableColorStyle"
    | "surfaceKind"
  >;
  numberFormat?: NumberFormatConfig;
  colorScheme?: ColorScheme;
  /** 组件实底色，用于表格/地图跟随组件外观而非仅 colorScheme */
  widgetShellColor?: string;
  showLoadingHint?: boolean;
  suspendLiveResize?: boolean;
  widgetId?: string;
  drillEnabled?: boolean;
  /** 看板编辑态内嵌（关闭地图滚轮缩放等） */
  dashboardEditMode?: boolean;
  queryEnabled?: boolean;
  renderEnabled?: boolean;
  /** 挂载门控原因：排队 vs 屏外暂停 */
  mountGateStatus?: "queue" | "offscreen";
  onMountReady?: () => void;
  onChartConfigChange?: (config: ChartViewConfig) => void;
  geo3dRenderTier?: import("@/components/charts/engine/three/geo3dRuntime").Geo3dRenderTier;
  geo3dAnimationActive?: boolean;
};

function sizeSpanEqual(
  a?: { w: number; h: number },
  b?: { w: number; h: number },
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.w === b.w && a.h === b.h;
}

function pixelSizeEqual(
  a?: { width: number; height: number },
  b?: { width: number; height: number },
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.width === b.width && a.height === b.height;
}

function filterParamsEqual(
  a?: Record<string, string>,
  b?: Record<string, string>,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

function chartRendererPropsAreEqual(
  prev: ChartRendererProps,
  next: ChartRendererProps,
): boolean {
  return (
    prev.config === next.config &&
    prev.title === next.title &&
    prev.mode === next.mode &&
    prev.embedded === next.embedded &&
    sizeSpanEqual(prev.gridSpan, next.gridSpan) &&
    pixelSizeEqual(prev.pixelSize, next.pixelSize) &&
    prev.contentChromePx === next.contentChromePx &&
    filterParamsEqual(prev.filterParameters, next.filterParameters) &&
    prev.executeKey === next.executeKey &&
    prev.queryLimit === next.queryLimit &&
    prev.paletteId === next.paletteId &&
    prev.paletteColors === next.paletteColors &&
    prev.dashboardColorDefaults === next.dashboardColorDefaults &&
    prev.numberFormat === next.numberFormat &&
    prev.colorScheme === next.colorScheme &&
    prev.widgetShellColor === next.widgetShellColor &&
    prev.showLoadingHint === next.showLoadingHint &&
    prev.suspendLiveResize === next.suspendLiveResize &&
    prev.widgetId === next.widgetId &&
    prev.drillEnabled === next.drillEnabled &&
    prev.dashboardEditMode === next.dashboardEditMode &&
    prev.queryEnabled === next.queryEnabled &&
    prev.renderEnabled === next.renderEnabled &&
    prev.mountGateStatus === next.mountGateStatus &&
    prev.geo3dRenderTier === next.geo3dRenderTier &&
    prev.geo3dAnimationActive === next.geo3dAnimationActive
  );
}

export const ChartRenderer = memo(function ChartRenderer({
  config,
  title = "图表",
  mode = "preview",
  embedded = false,
  gridSpan,
  pixelSize,
  contentChromePx = 0,
  filterParameters,
  executeKey,
  queryLimit,
  paletteId,
  paletteColors,
  dashboardColorDefaults,
  numberFormat,
  colorScheme = "light",
  widgetShellColor,
  showLoadingHint = true,
  suspendLiveResize: suspendLiveResizeProp = false,
  widgetId,
  drillEnabled = false,
  dashboardEditMode = false,
  queryEnabled = true,
  renderEnabled = true,
  mountGateStatus,
  onMountReady,
  onChartConfigChange,
  geo3dRenderTier,
  geo3dAnimationActive = true,
}: ChartRendererProps) {
  const drill = useChartDrill(drillEnabled ? widgetId : undefined);
  const effectiveConfig = useMemo(() => migrateChartViewConfig(config), [config]);
  const manualDrillStack = useMemo(
    () => readManualGeoMapDrillStack(effectiveConfig),
    [effectiveConfig],
  );
  const persistedDrillStack = useMemo(
    () => manualDrillStack ?? [],
    [manualDrillStack],
  );

  const isGeoMapChart = isGeoMapChartType(effectiveConfig.chartType);

  const persistedRevisionRef = useRef(
    manualDrillStack === undefined ? "__unset__" : drillStackRevision(manualDrillStack),
  );

  useEffect(() => {
    if (!drillEnabled || !widgetId || !drill.active) return;

    const revision =
      manualDrillStack === undefined ? "__unset__" : drillStackRevision(manualDrillStack);
    const configChanged = revision !== persistedRevisionRef.current;
    if (!configChanged) return;
    persistedRevisionRef.current = revision;

    if (!isGeoMapChart) {
      if (drill.stack.length > 0) return;
      if (!persistedDrillStack.length) return;
      drill.setStack(persistedDrillStack);
      return;
    }

    // 仅在配置侧 revision 变化时同步；禁止用旧 config 覆盖用户刚点的「返回/全部」
    if (manualDrillStack === undefined) {
      if (!drill.stack.length && persistedDrillStack.length) {
        drill.setStack(persistedDrillStack);
      }
      return;
    }
    if (manualDrillStack.length) drill.setStack(manualDrillStack);
    else drill.reset();
  }, [
    drillEnabled,
    drill.active,
    drill.reset,
    drill.setStack,
    drill.stack.length,
    isGeoMapChart,
    manualDrillStack,
    persistedDrillStack,
    widgetId,
  ]);

  const effectiveDrillStack = useMemo(() => {
    if (isGeoMapChart) {
      // 有 DrillContext 时以 live stack 为准，避免 config 滞后把返回全国冲掉
      if (drill.active) return drill.stack;
      if (manualDrillStack !== undefined) return manualDrillStack;
      return [];
    }
    return drill.stack.length > 0 ? drill.stack : persistedDrillStack;
  }, [isGeoMapChart, drill.active, drill.stack, manualDrillStack, persistedDrillStack]);

  const mergedFilterParameters = useMemo(
    () => ({
      ...filterParameters,
      ...drillStackToFilterParameters(effectiveDrillStack),
    }),
    [filterParameters, effectiveDrillStack],
  );
  const drillRevision = drillStackRevision(effectiveDrillStack);
  const resolvedExecuteKey = drillRevision
    ? `${executeKey ?? "chart"}:drill:${drillRevision}`
    : executeKey;
  const isShapePlaying = usePixelShapePlayer();
  const isGridPlaying = useDashboardGridPlayer();
  const suspendLiveResize = suspendLiveResizeProp || isShapePlaying || isGridPlaying;
  const { ref: bodyRef, size: bodySize, remeasure: remeasureBody } = useElementSize<HTMLDivElement>({
    enabled: embedded,
    paused: suspendLiveResize,
  });
  const resolvedScheme = useDashboardColorScheme(bodyRef, colorScheme);
  const surfaceScheme = resolveEffectiveChartScheme(resolvedScheme, widgetShellColor);
  const isDark = surfaceScheme === "dark";
  const fillHeight = useMemo(() => {
    if (!embedded) return Math.max(180, bodySize.height || 180);
    return embeddedBodyHeight(bodySize, pixelSize, contentChromePx, gridSpan);
  }, [
    embedded,
    bodySize.height,
    pixelSize?.width,
    pixelSize?.height,
    contentChromePx,
    gridSpan?.h,
  ]);

  useEffect(() => {
    if (!embedded || suspendLiveResize) return;
    if (!pixelSize || pixelSize.width <= 0 || pixelSize.height <= 0) return;
    remeasureBody();
  }, [
    embedded,
    suspendLiveResize,
    pixelSize?.width,
    pixelSize?.height,
    remeasureBody,
  ]);
  const chartSize = useMemo(() => {
    if (embedded) {
      return { width: undefined as number | undefined, height: undefined as number | undefined };
    }
    return { width: bodySize.width || undefined, height: fillHeight };
  }, [embedded, bodySize.width, fillHeight]);
  const { columns, rows, loading, error, slowHint, rerun } = useChartExecute(config, {
    filterParameters: mergedFilterParameters,
    executeKey: resolvedExecuteKey,
    limit: queryLimit,
    enabled: queryEnabled,
  });
  const mountReadySentRef = useRef(false);
  const [page, setPage] = useState(1);
  const [localConfig, setLocalConfig] = useState(() => effectiveConfig);
  const drillInteraction =
    drillEnabled && Boolean(widgetId) && supportsChartDrillInteraction(localConfig);
  const isMapChart = isGeoMapChartType(localConfig.chartType);
  const isHeatmapChart = isMatrixHeatmapChartType(localConfig.chartType);
  const isGeoChart = isMapChart || isHeatmapChart;
  const empty = !loading && !error && (rows?.length ?? 0) === 0 && !isGeoChart;

  useEffect(() => {
    mountReadySentRef.current = false;
  }, [config, drillRevision, renderEnabled, queryEnabled]);

  useEffect(() => {
    if (!renderEnabled || mountReadySentRef.current || !onMountReady) return;
    if (!queryEnabled) return;
    if (loading) return;
    mountReadySentRef.current = true;
    onMountReady();
  }, [renderEnabled, queryEnabled, loading, error, empty, isGeoChart, onMountReady]);

  useLayoutEffect(() => {
    setLocalConfig(effectiveConfig);
  }, [effectiveConfig]);

  useEffect(() => {
    setPage(1);
  }, [config, drillRevision]);

  const [mapDrillError, setMapDrillError] = useState<string | null>(null);

  useEffect(() => {
    setMapDrillError(null);
  }, [config, drillRevision]);

  const drillPipeline = useMemo(() => {
    if (!drillInteraction && !effectiveDrillStack.length) {
      return {
        rows: rows as unknown[][],
        columns,
        displayField: undefined as string | undefined,
      };
    }
    if (isGeoMapChartType(localConfig.chartType)) {
      return applyMapChartDrillPipeline(localConfig, columns, rows as unknown[][], effectiveDrillStack);
    }
    return applyChartDrillPipeline(localConfig, columns, rows as unknown[][], effectiveDrillStack);
  }, [drillInteraction, effectiveDrillStack, localConfig, columns, rows]);

  const drillFilterRows = useMemo(() => {
    if (!effectiveDrillStack.length) return rows as unknown[][];
    return filterRowsByDrillStack(rows as unknown[][], columns, effectiveDrillStack);
  }, [rows, columns, effectiveDrillStack]);

  const displayRows = drillPipeline.rows;
  const displayColumns = drillPipeline.columns;

  const drillClickField = useMemo(() => {
    if (!drillInteraction) return undefined;
    if (isGeoMapChartType(localConfig.chartType)) {
      return getMapDrillClickField(localConfig, effectiveDrillStack);
    }
    return getClickDrillField(localConfig, effectiveDrillStack);
  }, [drillInteraction, localConfig, effectiveDrillStack]);

  const persistManualDrillStack = useCallback(
    (stack: typeof effectiveDrillStack) => {
      if (!isGeoMapChartType(localConfig.chartType)) return;
      const next = patchChartDeStyleNested(localConfig, "geo", {
        // 空栈写 undefined，表示「明确全国 / 未手动锁定」，避免 [] 与滞后 config 互相打架
        manualDrillStack: stack.length ? stack : undefined,
      });
      setLocalConfig(next);
      onChartConfigChange?.(next);
    },
    [localConfig, onChartConfigChange],
  );

  const handleDrillClick = useCallback(
    (value: string, label?: string) => {
      if (!drillInteraction) return;
      if (isGeoMapChartType(localConfig.chartType) && value && !canDrillDeeper(effectiveDrillStack, localConfig)) {
        const chain = getDrillChain(localConfig);
        if (chain.length >= 2 && effectiveDrillStack.length >= chain.length - 1) {
          setMapDrillError("已是最后一层");
        }
        return;
      }
      const field =
        isGeoMapChartType(localConfig.chartType)
          ? getMapDrillClickField(localConfig, effectiveDrillStack)
          : getClickDrillField(localConfig, effectiveDrillStack);
      if (!field || !value) return;

      const frame = { field, value, label: label ?? value };
      if (isGeoMapChartType(localConfig.chartType)) {
        void preflightMapDrillClick(localConfig, effectiveDrillStack, frame).then((result) => {
          if (!result.ok) {
            setMapDrillError(result.message);
            return;
          }
          setMapDrillError(null);
          const nextStack = [...effectiveDrillStack, frame];
          drill.setStack(nextStack);
          persistManualDrillStack(nextStack);
        });
        return;
      }
      drill.push(frame);
    },
    [localConfig, drill, drillInteraction, effectiveDrillStack, persistManualDrillStack],
  );

  const jumpConfig = useMemo(() => readChartJumpConfig(config), [config]);
  const jumpHref = useMemo(() => resolveChartJumpHref(jumpConfig), [jumpConfig]);
  const jumpInteraction =
    drillEnabled && !drillInteraction && chartJumpIsConfigured(jumpConfig);

  const handleJumpClick = useCallback(() => {
    if (!jumpHref) return;
    if (jumpConfig.openInNewTab !== false) {
      window.open(jumpHref, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.assign(jumpHref);
  }, [jumpConfig.openInNewTab, jumpHref]);

  const renderModel = useMemo(
    () =>
      !loading && !error
        ? buildChartRenderModel(localConfig, displayColumns, displayRows as (string | number | boolean | null)[][])
        : null,
    [localConfig, displayColumns, displayRows, loading, error],
  );
  const deStyle = useMemo(() => readChartDeStyle(localConfig), [localConfig]);
  const chartColors = useMemo(() => {
    const base = deStyle.paletteId
      ? resolveChartColors(deStyle.paletteId)
      : resolveChartColors(paletteId, paletteColors);
    const opacity = readChartPaletteOpacity(localConfig, dashboardColorDefaults);
    return applyChartColorsOpacity(base, opacity);
  }, [deStyle.paletteId, localConfig, dashboardColorDefaults, paletteId, paletteColors]);
  const valueFormat = useMemo(
    () => resolveChartValueFormat(deStyle.label, numberFormat, localConfig.chartType),
    [deStyle.label, numberFormat, localConfig.chartType],
  );

  const mapPlaceholderHint = useMemo(() => {
    if (!isMapChart) return undefined;
    if (!isChartExecuteReady(localConfig)) return "请配置数据源与 SQL";
    const phase = resolveChartConfigPhase(localConfig);
    if (!phase.renderReady) return DEFAULT_GEO_MAP_PLACEHOLDER_HINT;
    const regionField = localConfig.dimensions?.[0]?.field ?? "";
    if (regionField && (rows?.length ?? 0) > 0) {
      const stats = activeGeoEngine.analyzeMatch(
        rows as unknown[][],
        columns,
        regionField,
      );
      if (stats.total > 0 && stats.matched === 0) {
        return MAP_REGION_NAME_HINT;
      }
    }
    if (renderModel?.kind === "error") {
      return renderModel.message.split("。")[0] ?? renderModel.message;
    }
    if (!loading && !error && (rows?.length ?? 0) === 0) return "暂无数据";
    return undefined;
  }, [isMapChart, localConfig, loading, error, rows, columns, renderModel]);

  const heatmapPlaceholderHint = useMemo(() => {
    if (!isHeatmapChart) return undefined;
    if (!isChartExecuteReady(localConfig)) return "请配置数据源与 SQL";
    const phase = resolveChartConfigPhase(localConfig);
    if (!phase.renderReady) return DEFAULT_GEO_HEATMAP_PLACEHOLDER_HINT;
    if (renderModel?.kind === "error") {
      return renderModel.message.split("。")[0] ?? renderModel.message;
    }
    if (!loading && !error && (rows?.length ?? 0) === 0) return "暂无数据";
    return undefined;
  }, [isHeatmapChart, localConfig, loading, error, rows, renderModel]);

  const shellLegendEligible =
    embedded &&
    isCanvasChartType(localConfig.chartType) &&
    !isGeoMapChartType(localConfig.chartType) &&
    localConfig.chartType !== "heatmap" &&
    supportsEmbeddedShellLegend(localConfig.chartType);

  const shellLegendVisible =
    shellLegendEligible && readChartLegendVisible(deStyle, { embedded: true });

  const chartViewModel = useMemo(() => {
    let configForView = localConfig;
    if (isGeoMapChartType(localConfig.chartType) && drillPipeline.displayField) {
      const dims = [...(localConfig.dimensions ?? [])];
      while (dims.length === 0) dims.push({ field: "" });
      dims[0] = { ...dims[0], field: drillPipeline.displayField };
      configForView = { ...localConfig, dimensions: dims };
    }
    return buildChartViewModel(configForView, {
      columns: displayColumns,
      rows: displayRows as unknown[][],
    });
  }, [localConfig, displayColumns, displayRows, drillPipeline.displayField]);

  const styleContext = useMemo(
    () =>
      buildStyleContext({
        config: localConfig,
        scheme: surfaceScheme,
        chartColors,
        dashboardPaletteId: paletteId,
        dashboardDefaults: dashboardColorDefaults,
        shellLegend: false,
        embedEdit: embedded && dashboardEditMode,
        numberFormat,
        widgetShellBg: widgetShellColor,
      }),
    [
      localConfig,
      surfaceScheme,
      chartColors,
      paletteId,
      dashboardColorDefaults,
      embedded,
      dashboardEditMode,
      numberFormat,
      widgetShellColor,
    ],
  );

  const shellLegendItemsRef = useRef<ChartLegendItem[]>([]);
  const shellLegendItems = useMemo(() => {
    if (!shellLegendVisible || error) {
      return shellLegendItemsRef.current;
    }
    if (loading) {
      return shellLegendItemsRef.current;
    }
    if (!renderModel || renderModel.kind !== "ready") {
      return shellLegendItemsRef.current;
    }
    const snapshot = buildLegendSnapshot(chartViewModel, {
      ...styleContext,
      shellLegend: true,
    });
    if (snapshot.items.length > 0) {
      shellLegendItemsRef.current = snapshot.items;
    }
    return snapshot.items.length > 0 ? snapshot.items : shellLegendItemsRef.current;
  }, [
    shellLegendVisible,
    loading,
    error,
    renderModel,
    chartViewModel,
    styleContext,
  ]);


  const suppressInlineLegend = shellLegendEligible && shellLegendVisible;
  const useShellLegendLayout = suppressInlineLegend && shellLegendItems.length > 0;
  const shellLegendPosition = readChartLegendPosition(deStyle);

  const shellLegendState = useMemo(
    () => ({
      visible: useShellLegendLayout,
      position: shellLegendPosition,
      orient: readChartLegendOrient(deStyle),
      hAlign: readChartLegendHAlign(deStyle),
      vAlign: readChartLegendVAlign(deStyle),
      fontSize: deStyle.legend?.fontSize ?? 12,
      icon: readChartLegendIcon(deStyle),
      iconSize: readChartLegendIconSize(deStyle),
      textColor: deStyle.legend?.color,
      items: shellLegendItems,
    }),
    [
      useShellLegendLayout,
      shellLegendPosition,
      deStyle.legend?.fontSize,
      deStyle.legend?.orient,
      deStyle.legend?.hAlign,
      deStyle.legend?.vAlign,
      deStyle.legend?.icon,
      deStyle.legend?.iconSize,
      deStyle.legend?.color,
      shellLegendItems,
    ],
  );
  usePublishWidgetShellLegend(shellLegendState, embedded && shellLegendEligible);

  const handleChartInteraction = useCallback(
    (event: ChartInteractionEvent) => {
      if (event.kind !== "drill") return;
      handleDrillClick(event.value, event.label);
    },
    [handleDrillClick],
  );

  const handleTableStylePatch = useCallback(
    (patch: Parameters<typeof patchChartDeTableStyle>[1]) => {
      if (!onChartConfigChange) return;
      const next = patchChartDeTableStyle(localConfig, patch);
      setLocalConfig(next);
      onChartConfigChange(next);
    },
    [localConfig, onChartConfigChange],
  );

  const canvasChart = () => (
    <CanvasChartHost
      viewModel={chartViewModel}
      style={{
        ...styleContext,
        shellLegend: suppressInlineLegend,
      }}
      ariaLabel={title}
      isDark={isDark}
      fill={embedded}
      height={embedded ? undefined : chartSize.height}
      width={embedded ? undefined : chartSize.width}
      mapPlaceholderHint={mapPlaceholderHint}
      mapDrillError={mapDrillError}
      heatmapPlaceholderHint={heatmapPlaceholderHint}
      drillLookupRows={drillFilterRows}
      chartConfig={localConfig}
      drillStack={effectiveDrillStack}
      drillClickField={drillClickField}
      onInteraction={drillInteraction ? handleChartInteraction : undefined}
      onJumpClick={jumpInteraction ? handleJumpClick : undefined}
      onTableStylePatch={dashboardEditMode ? handleTableStylePatch : undefined}
      layoutFootprint={
        embedded && pixelSize && pixelSize.width > 0 && pixelSize.height > 0
          ? pixelSize
          : undefined
      }
      geo3dRenderTier={geo3dRenderTier ?? defaultGeo3dRenderTier(embedded)}
      geo3dAnimationActive={geo3dAnimationActive}
      instanceKey={widgetId}
    />
  );

  const renderBody = () => {
    if (!renderEnabled) {
      const gateLabel =
        mountGateStatus === "offscreen" ? "图表屏外已暂停" : "图表排队加载中";
      return embedded ? (
        <Skeleton className="h-full w-full rounded-lg" aria-busy="true" aria-label={gateLabel} />
      ) : (
        <Skeleton className="h-48 w-full rounded-lg" aria-busy="true" aria-label={gateLabel} />
      );
    }

    const wrapEmbedded = (node: ReactNode) =>
      embedded ? embeddedChartSurface(node) : node;

    if (isCanvasChartType(localConfig.chartType)) {
      const chartType = localConfig.chartType;
      if (isCartesianRowLimitedType(chartType) && displayRows.length > CHART_EXECUTE_LIMIT) {
        const message = `结果超过 ${CHART_EXECUTE_LIMIT} 行，请缩小查询范围`;
        return embedded
          ? embeddedStateMessage(dwStateWarning, message)
          : <p className="text-theme-sm text-warning-600 dark:text-warning-400">{message}</p>;
      }
      if (isGeoMapChartType(chartType) || isMatrixHeatmapChartType(chartType)) {
        return wrapEmbedded(canvasChart());
      }
      if (!renderModel || renderModel.kind === "empty") {
        return embedded
          ? embeddedEmptyMessage()
          : <p className="text-theme-sm text-gray-500">暂无数据</p>;
      }
      if (renderModel.kind === "error") {
        return embedded
          ? embeddedErrorMessage(renderModel.message)
          : <p className="text-theme-sm text-gray-500">{renderModel.message}</p>;
      }
      return wrapEmbedded(canvasChart());
    }

    if (isLegacyTableChartType(localConfig.chartType)) {
      if (!renderModel || renderModel.kind === "empty") {
        return embedded
          ? embeddedEmptyMessage()
          : <p className="text-theme-sm text-gray-500">暂无数据</p>;
      }
      if (renderModel.kind === "error") {
        return embedded
          ? embeddedErrorMessage(renderModel.message)
          : <p className="text-theme-sm text-gray-500">{renderModel.message}</p>;
      }
      const cols = renderModel.kind === "table" ? renderModel.displayCols : columns;
      const tableStyle = mergeChartTableStyle(
        readChartDeTableStyle(localConfig),
        dashboardColorDefaults?.tableColorStyle,
      );
      const tableThemeVars = resolveTableThemeVars(tableStyle, {
        colorScheme: resolvedScheme,
        widgetShellBg: widgetShellColor,
      });
      const metricFields = (localConfig.metrics ?? [])
        .map((metric) => metric.field)
        .filter((field): field is string => Boolean(field));

      return wrapEmbedded(
        <EmbeddedChartTable
          embedded
          columns={displayColumns}
          displayCols={cols}
          rows={displayRows}
          page={page}
          onPageChange={setPage}
          tableStyle={tableStyle}
          themeVars={tableThemeVars}
          surfaceScheme={surfaceScheme}
          valueFormat={valueFormat}
          metricFields={metricFields}
          drillField={drillClickField}
          onDrillCellClick={
            drillInteraction && drillClickField
              ? (_field, value) => handleDrillClick(value)
              : undefined
          }
          onTableStylePatch={dashboardEditMode ? handleTableStylePatch : undefined}
        />,
      );
    }

    return embedded
      ? embeddedStateMessage(dwState, "暂不支持的图表类型")
      : <p className="text-theme-sm text-gray-500">暂不支持的图表类型</p>;
  };

  const body = !loading && !error && (!empty || isMapChart) ? (
    <div
      className={
        mode === "config"
          ? "grid gap-4 lg:grid-cols-2"
          : embedded
            ? "relative h-full min-h-0 w-full overflow-hidden"
            : ""
      }
    >
      {mode === "config" ? (
        <ChartConfigPanel
          config={localConfig}
          columns={columns}
          onChange={setLocalConfig}
        />
      ) : null}
      <div
        className={
          embedded ? "absolute inset-0 flex min-h-0 flex-col overflow-hidden" : undefined
        }
      >
        {embedded && effectiveDrillStack.length > 0 ? (
          <ChartDrillChrome
            className="pointer-events-auto absolute inset-x-2 top-2 z-[3]"
            stack={effectiveDrillStack}
            notice={mapDrillError}
            onBack={() => {
              const next = effectiveDrillStack.slice(0, -1);
              if (next.length) drill.navigateTo(next.length);
              else drill.reset();
              persistManualDrillStack(next);
            }}
            onReset={() => {
              drill.reset();
              persistManualDrillStack([]);
            }}
            onNavigate={(depth) => {
              const next = depth <= 0 ? [] : effectiveDrillStack.slice(0, depth);
              drill.navigateTo(depth);
              persistManualDrillStack(next);
            }}
          />
        ) : null}
        <div className={embedded ? "relative min-h-0 flex-1 overflow-hidden" : undefined}>
          {renderBody()}
        </div>
      </div>
    </div>
  ) : null;

  if (embedded) {
    const gateLabel =
      mountGateStatus === "offscreen" ? "图表屏外已暂停" : "图表排队加载中";
    if (!renderEnabled || !queryEnabled) {
      return (
        <div ref={bodyRef} className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
          <Skeleton
            className="absolute inset-0 rounded-lg"
            aria-busy="true"
            aria-label={gateLabel}
          />
        </div>
      );
    }

    const showBlockingLoading = loading && columns.length === 0 && rows.length === 0;
    return (
      <div ref={bodyRef} className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
        {showBlockingLoading ? (
          <Skeleton
            className={cn(
              "absolute inset-0 rounded-lg",
              !showLoadingHint && "opacity-40",
            )}
            aria-busy="true"
            aria-label="图表加载中"
          />
        ) : error ? (
          <div
            role="alert"
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border p-3",
              isDark
                ? "border-error-500/30 bg-error-950/40"
                : "border-error-500/40 bg-error-50/80",
            )}
          >
            <p className={cn("text-center", dwStateError)}>{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={rerun}>
              重试
            </Button>
          </div>
        ) : empty && !isMapChart ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {embeddedEmptyMessage()}
          </div>
        ) : (
          body
        )}
      </div>
    );
  }

  return (
    <ChartPanel
      title={title}
      loading={loading}
      error={error}
      empty={empty && !isMapChart}
      slowHint={slowHint}
      onRetry={rerun}
    >
      {body}
    </ChartPanel>
  );
}, chartRendererPropsAreEqual);
