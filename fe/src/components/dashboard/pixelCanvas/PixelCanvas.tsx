import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  isPaletteDragEvent,
  readPaletteDragPayload,
  type PaletteDragPayload,
} from "@/lib/dashboardDnd";
import type {
  DashboardCanvas,
  DashboardLayoutV2,
  PixelLayoutWidget,
} from "../layoutUtils";
import { getTopLevelPixelWidgets, findTabsHostAtPoint } from "../layoutUtils";
import type { ScaleMode, DashboardStyleConfig } from "../dashboardStyleConfig";
import { usePaletteDragActive, useTabInsertIntent } from "./paletteDragContext";
import { TabPaletteDropZones } from "./TabPaletteDropZones";
import { preservePixelCanvasHostScroll, consumePendingCanvasHostScrollRestore } from "./preserveCanvasHostScroll";
import type { TabInsertIntent } from "./tabInsertResolver";
import {
  TAB_PALETTE_DROP_BUFFER_PX,
  TAB_PALETTE_DROP_VISUAL_BUFFER_PX,
  resolveTabHostForWidgetDrop,
  tryAbsorbTopLevelWidgetIntoTab,
} from "./tabInsertResolver";
import { TabPaletteDropTargetProvider } from "./tabPaletteDropTargetContext";
import { TabChildExtractProvider } from "./tabChildExtractContext";
import { canUnparkTabChildAtPoint } from "./tabParking";
import {
  canvasArtboardStyleFingerprint,
  pickWidgetDashboardStyle,
  resolveArtboardStyle,
  widgetDashboardStyleFingerprint,
} from "../dashboardStyleConfig";
import { resolveComponentGapRuntime } from "../componentGapRuntime";
import { auxiliaryGridPatternStyle, resolveDashboardChrome } from "../dashboardChromeConfig";
import { resolvePixelCollisions, shouldRevertPixelDragCommit, widgetRect } from "./collisionLayout";
import type { PixelPoint, PixelRect } from "./geometry";
import { clientPointToCanvasFromStage, PIXEL_CANVAS_EDIT_MIN_SCALE, resolvePixelCanvasMeasureElement, resolvePixelCanvasMeasureWidth, resolveScaleDesignHeight, scaledCanvasMetrics } from "./geometry";
import { PixelShape } from "./PixelShape";
import type { PixelWidgetActions } from "./PixelShapeActionRail";
import { PixelMarkLineOverlay } from "./PixelMarkLineOverlay";
import { PixelCanvasInteractionProvider } from "./PixelCanvasInteractionContext";
import { markLineGuidesEqual } from "./markLineGuidesEqual";
import type { MarkLineGuide } from "./pixelMarkLine";
import { PixelWidgetSlot } from "./PixelWidgetSlot";
import { createPixelShapePreviewRegistry } from "./pixelShapePreviewRegistry";
import { autoScrollPixelCanvasHost } from "./pixelCanvasAutoScroll";
import { routePixelCanvasWheel } from "./pixelCanvasWheelScroll";
import { pixelRectsNearlyEqual } from "./pixelRectEqual";
import { PixelCanvasScaleProvider } from "./PixelCanvasScaleContext";

type PixelCanvasProps = {
  mode: "edit" | "view";
  layout: DashboardLayoutV2;
  renderWidget: (widget: PixelLayoutWidget) => ReactNode;
  selectedIds?: Set<string>;
  onSelect?: (widgetId: string, additive: boolean) => void;
  onClearSelection?: () => void;
  onLayoutChange?: (layout: DashboardLayoutV2) => void;
  onViewportChange?: (viewport: PixelRect) => void;
  onPaletteDrop?: (
    type: PaletteDragPayload,
    point: { x: number; y: number },
    sourceEvent?: DragEvent,
  ) => void;
  onTabPaletteDrop?: (tabsWidgetId: string, type: PaletteDragPayload) => void;
  onTabChildUnpark?: (widgetId: string, point: PixelPoint) => void;
  onTabInsertIntentChange?: (intent: TabInsertIntent | null) => void;
  widgetActions?: PixelWidgetActions;
  className?: string;
  scaleMode?: ScaleMode;
  styleConfig?: DashboardStyleConfig;
  widgetContentRevision?: (widget: PixelLayoutWidget) => string;
  /** 外层视口已锁定设计尺寸缩放（大屏投放） */
  designViewportLocked?: boolean;
};

export const PIXEL_CANVAS_GUTTER = 0;

export const PIXEL_CANVAS_MIN_HEIGHT = 320;

/** 保留导出供历史测试引用；DE 模型不在拖动中推挤邻组件 */
export const PIXEL_PREVIEW_THROTTLE_MS = 32;

export function canvasScaleForHost(
  hostWidth: number,
  canvasWidth: number,
  gutter = PIXEL_CANVAS_GUTTER,
): number {
  if (hostWidth <= gutter || canvasWidth <= 0) return 1;
  return (hostWidth - gutter) / canvasWidth;
}

export function fitCanvasHeightToContent(
  layout: DashboardLayoutV2,
  minHeight = PIXEL_CANVAS_MIN_HEIGHT,
): DashboardLayoutV2 {
  const lowest = getTopLevelPixelWidgets(layout.widgets).reduce(
    (max, widget) => Math.max(max, widget.y + widget.height),
    0,
  );
  const height = Math.max(minHeight, lowest);
  if (height === layout.canvas.height) return layout;
  return {
    ...layout,
    canvas: {
      ...layout.canvas,
      height,
    },
  };
}
export function visibleCanvasViewport(
  host: Pick<HTMLElement, "scrollLeft" | "scrollTop" | "clientWidth" | "clientHeight">,
  scale: number,
  canvas: DashboardCanvas,
): PixelRect {
  const safeScale = scale > 0 ? scale : 1;
  const hiddenGutter = Math.min(host.scrollLeft, PIXEL_CANVAS_GUTTER);
  const x = Math.max(0, (host.scrollLeft - PIXEL_CANVAS_GUTTER) / safeScale);
  const y = host.scrollTop / safeScale;
  return {
    x,
    y,
    width: Math.min(
      canvas.width - x,
      (host.clientWidth - PIXEL_CANVAS_GUTTER + hiddenGutter) / safeScale,
    ),
    height: Math.min(canvas.height - y, host.clientHeight / safeScale),
  };
}

export function PixelCanvas({
  mode,
  layout,
  renderWidget,
  selectedIds,
  onSelect,
  onClearSelection,
  onLayoutChange,
  onViewportChange,
  onPaletteDrop,
  onTabPaletteDrop,
  onTabChildUnpark,
  onTabInsertIntentChange,
  widgetActions,
  className,
  scaleMode = "canvas",
  styleConfig = {},
  widgetContentRevision,
  designViewportLocked = false,
}: PixelCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previewRegistryRef = useRef(createPixelShapePreviewRegistry());
  const metricsFrameRef = useRef<number | null>(null);
  const viewportRef = useRef<PixelRect>({
    x: 0,
    y: 0,
    width: layout.canvas.width,
    height: layout.canvas.height,
  });
  const [scale, setScale] = useState(1);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [stageLeft, setStageLeft] = useState(0);
  const [centerContent, setCenterContent] = useState(false);
  const [scrollX, setScrollX] = useState(false);
  const [paletteDragOver, setPaletteDragOver] = useState(false);
  const [paletteDragPoint, setPaletteDragPoint] = useState<PixelPoint | null>(null);
  const [shapeDragWidget, setShapeDragWidget] = useState<PixelLayoutWidget | null>(null);
  const paletteDragActive = usePaletteDragActive();
  const tabInsertIntent = useTabInsertIntent();
  const [markGuides, setMarkGuides] = useState<MarkLineGuide[]>([]);
  const [playingWidgetId, setPlayingWidgetId] = useState<string | null>(null);
  const previewThrottleRef = useRef(0);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPreviewRef = useRef<PixelLayoutWidget | null>(null);
  const [visibleViewport, setVisibleViewport] = useState<PixelRect>(() => ({
    x: 0,
    y: 0,
    width: layout.canvas.width,
    height: layout.canvas.height,
  }));

  const publishViewport = useCallback(
    (next: PixelRect) => {
      if (pixelRectsNearlyEqual(viewportRef.current, next)) return;
      viewportRef.current = next;
      setVisibleViewport(next);
      onViewportChange?.(next);
    },
    [onViewportChange],
  );
  const widgetChromeStyle = useMemo(
    () => pickWidgetDashboardStyle(styleConfig),
    [widgetDashboardStyleFingerprint(styleConfig)],
  );
  const chrome = resolveDashboardChrome(styleConfig);
  const gapRuntime = useMemo(
    () => resolveComponentGapRuntime(styleConfig, "pixel"),
    [styleConfig],
  );
  const activeLayout = layout;
  const topLevelWidgets = useMemo(
    () => getTopLevelPixelWidgets(activeLayout.widgets),
    [activeLayout.widgets],
  );
  const visibleTopLevelWidgets = useMemo(
    () => (mode === "edit" ? topLevelWidgets : topLevelWidgets.filter((w) => !w.hidden)),
    [mode, topLevelWidgets],
  );
  const layoutGeometryKey = useMemo(
    () =>
      topLevelWidgets
        .map((widget) => `${widget.id}:${widget.x},${widget.y},${widget.width},${widget.height}`)
        .join("|"),
    [topLevelWidgets],
  );

  useEffect(() => {
    if (shapeDragWidget) return;
    previewRegistryRef.current.reset(
      activeLayout.widgets.map((widget) => ({ id: widget.id, ...widgetRect(widget) })),
    );
  }, [layoutGeometryKey, shapeDragWidget, activeLayout.widgets]);
  const tabHosts = useMemo(
    () => topLevelWidgets.filter((w) => w.type === "tabs" && w.tabsConfig),
    [topLevelWidgets],
  );
  const activeTabDropId = useMemo(() => {
    if (!paletteDragPoint || tabHosts.length === 0) return null;
    return (
      findTabsHostAtPoint(
        activeLayout.widgets,
        paletteDragPoint,
        TAB_PALETTE_DROP_BUFFER_PX,
      )?.id ?? null
    );
  }, [paletteDragPoint, tabHosts.length, activeLayout.widgets]);

  useEffect(() => {
    if (!paletteDragActive || !onTabInsertIntentChange) return;
    if (!activeTabDropId) return;
    const host = tabHosts.find((t) => t.id === activeTabDropId);
    if (!host?.tabsConfig) return;
    onTabInsertIntentChange({
      tabsWidgetId: host.id,
      paneId: host.tabsConfig.activePaneId,
    });
  }, [activeTabDropId, onTabInsertIntentChange, paletteDragActive, tabHosts]);

  const shapeTabDropTargetId = useMemo(() => {
    if (!shapeDragWidget || shapeDragWidget.type === "tabs") return null;
    return (
      resolveTabHostForWidgetDrop(activeLayout, widgetRect(shapeDragWidget), {
        intent: tabInsertIntent,
        dropBufferPx: TAB_PALETTE_DROP_BUFFER_PX,
      })?.id ?? null
    );
  }, [activeLayout, shapeDragWidget, tabInsertIntent]);

  const isDraggingTabHost = shapeDragWidget?.type === "tabs";

  const activeTabDropTargetId = isDraggingTabHost
    ? null
    : activeTabDropId ?? shapeTabDropTargetId ?? tabInsertIntent?.tabsWidgetId ?? null;

  const showTabPaletteDropZones =
    mode === "edit" &&
    tabHosts.length > 0 &&
    !isDraggingTabHost &&
    (paletteDragActive || Boolean(shapeDragWidget)) &&
    Boolean(onTabPaletteDrop || shapeDragWidget);

  const reportTabHover = useCallback(
    (tabsWidgetId: string) => {
      if (!onTabInsertIntentChange) return;
      const host = tabHosts.find((t) => t.id === tabsWidgetId);
      if (!host?.tabsConfig) return;
      onTabInsertIntentChange({
        tabsWidgetId: host.id,
        paneId: host.tabsConfig.activePaneId,
      });
    },
    [onTabInsertIntentChange, tabHosts],
  );

  const showAuxGrid = mode === "edit" && chrome.showAuxiliaryGrid;
  const showMarkLines = mode === "edit";
  const scheme = styleConfig.colorScheme ?? "light";
  const artboardStyle = useMemo(
    () => resolveArtboardStyle(styleConfig),
    [canvasArtboardStyleFingerprint(styleConfig)],
  );
  const auxGridStyle = useMemo(
    () => auxiliaryGridPatternStyle(scheme),
    [scheme],
  );
  /** 编辑态固定按画布宽度贴满，避免「按组件比例」两侧留白与 1440 可用区不一致 */
  const effectiveScaleMode = mode === "edit" ? "canvas" : scaleMode;
  const viewCanvasHeight = useMemo(() => {
    const lowest = topLevelWidgets.reduce(
      (max, widget) => Math.max(max, widget.y + widget.height),
      0,
    );
    return Math.max(PIXEL_CANVAS_MIN_HEIGHT, lowest);
  }, [topLevelWidgets]);
  const viewCanvas = useMemo(
    () =>
      designViewportLocked
        ? { width: activeLayout.canvas.width, height: activeLayout.canvas.height }
        : { width: activeLayout.canvas.width, height: viewCanvasHeight },
    [activeLayout.canvas.width, activeLayout.canvas.height, designViewportLocked, viewCanvasHeight],
  );
  const designCanvasHeight = useMemo(
    () => resolveScaleDesignHeight(activeLayout.canvas.height),
    [activeLayout.canvas.height],
  );
  const editMinScale = mode === "edit" ? PIXEL_CANVAS_EDIT_MIN_SCALE : 0;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measureEl = resolvePixelCanvasMeasureElement(host);

    const applyMetrics = () => {
      if (designViewportLocked) {
        setScale(1);
        setStageLeft(0);
        setCenterContent(false);
        setScrollX(false);
        setContentSize({ width: viewCanvas.width, height: viewCanvas.height });
        publishViewport(visibleCanvasViewport(host, 1, viewCanvas));
        return;
      }
      const metrics = scaledCanvasMetrics(
        resolvePixelCanvasMeasureWidth(measureEl),
        measureEl.clientHeight,
        viewCanvas.width,
        designCanvasHeight,
        viewCanvas.height,
        PIXEL_CANVAS_GUTTER,
        effectiveScaleMode,
        editMinScale,
      );
      setScale((previous) =>
        Math.abs(previous - metrics.scale) < 0.0001 ? previous : metrics.scale,
      );
      setStageLeft((previous) => (previous === metrics.stageLeft ? previous : metrics.stageLeft));
      setCenterContent((previous) =>
        previous === metrics.centerContent ? previous : metrics.centerContent,
      );
      setScrollX((previous) => (previous === metrics.scrollX ? previous : metrics.scrollX));
      setContentSize((previous) => {
        const widthChanged = Math.abs(previous.width - metrics.contentWidth) >= 1;
        const heightDelta = Math.abs(previous.height - metrics.contentHeight);
        // 抑制滚动条出现/消失导致的 contentHeight 来回翻转（±1 列 scrollbar ≈ 8px）
        const heightChanged =
          previous.height === 0 ? true : heightDelta >= 12;
        if (!widthChanged && !heightChanged) return previous;
        return { width: metrics.contentWidth, height: metrics.contentHeight };
      });
      publishViewport(visibleCanvasViewport(host, metrics.scale, viewCanvas));
    };

    const scheduleMetrics = () => {
      if (metricsFrameRef.current !== null) return;
      metricsFrameRef.current = requestAnimationFrame(() => {
        metricsFrameRef.current = null;
        applyMetrics();
      });
    };

    scheduleMetrics();
    applyMetrics();
    const observer = new ResizeObserver(scheduleMetrics);
    observer.observe(measureEl);
    return () => {
      observer.disconnect();
      if (metricsFrameRef.current !== null) {
        cancelAnimationFrame(metricsFrameRef.current);
        metricsFrameRef.current = null;
      }
    };
  }, [publishViewport, viewCanvas, designCanvasHeight, mode, scaleMode, editMinScale, designViewportLocked, effectiveScaleMode]);

  useLayoutEffect(() => {
    consumePendingCanvasHostScrollRestore(hostRef.current);
  }, [contentSize, selectedIds]);

  const registerPreviewSync = useCallback(
    (widgetId: string, sync: (rect: PixelRect) => void) =>
      previewRegistryRef.current.register(widgetId, sync),
    [],
  );

  const clearPreviewChrome = useCallback(
    (snapshot?: DashboardLayoutV2) => {
      stageRef.current?.style.removeProperty("height");
      contentRef.current?.style.removeProperty("width");
      contentRef.current?.style.removeProperty("height");
      const source = snapshot ?? activeLayout;
      previewRegistryRef.current.reset(
        source.widgets.map((widget) => ({ id: widget.id, ...widgetRect(widget) })),
      );
    },
    [activeLayout],
  );

  const syncPreviewStageMetrics = useCallback(
    (nextLayout: DashboardLayoutV2) => {
      const host = hostRef.current;
      const stage = stageRef.current;
      const content = contentRef.current;
      if (!host || !stage) return;
      const lowest = nextLayout.widgets.reduce(
        (max, widget) => Math.max(max, widget.y + widget.height),
        0,
      );
      const viewHeight = Math.max(PIXEL_CANVAS_MIN_HEIGHT, lowest);
      const measureEl = resolvePixelCanvasMeasureElement(host);
      const metrics = scaledCanvasMetrics(
        resolvePixelCanvasMeasureWidth(measureEl),
        measureEl.clientHeight,
        activeLayout.canvas.width,
        resolveScaleDesignHeight(nextLayout.canvas.height),
        viewHeight,
        PIXEL_CANVAS_GUTTER,
        effectiveScaleMode,
        editMinScale,
      );
      stage.style.height = `${viewHeight}px`;
      if (content) {
        content.style.height = `${metrics.contentHeight}px`;
      }
    },
    [activeLayout.canvas.width, mode, scaleMode, editMinScale],
  );

  const resolveActiveAt = useCallback(
    (widget: PixelLayoutWidget) =>
      resolvePixelCollisions(
        activeLayout,
        widget.id,
        {
          x: widget.x,
          y: widget.y,
          width: widget.width,
          height: widget.height,
        },
        {
          gap: gapRuntime.collisionGapPx,
          minOverlap: gapRuntime.collisionOverlapBufferPx,
        },
      ),
    [activeLayout, gapRuntime.collisionGapPx, gapRuntime.collisionOverlapBufferPx],
  );

  const flushPreview = useCallback(
    (widget: PixelLayoutWidget) => {
      previewThrottleRef.current = Date.now();
      pendingPreviewRef.current = null;
      setShapeDragWidget(widget);
      const nextLayout = resolveActiveAt(widget);
      const positions = new Map(
        nextLayout.widgets.map((item) => [item.id, widgetRect(item)] as const),
      );
      previewRegistryRef.current.applyAll(positions);
      syncPreviewStageMetrics(nextLayout);
    },
    [resolveActiveAt, syncPreviewStageMetrics],
  );

  const handlePreview = useCallback(
    (widget: PixelLayoutWidget) => {
      setShapeDragWidget(widget);
      const elapsed = Date.now() - previewThrottleRef.current;
      if (elapsed >= PIXEL_PREVIEW_THROTTLE_MS) {
        flushPreview(widget);
        return;
      }
      pendingPreviewRef.current = widget;
      if (previewTimerRef.current) return;
      previewTimerRef.current = setTimeout(() => {
        previewTimerRef.current = null;
        const pending = pendingPreviewRef.current;
        if (pending) flushPreview(pending);
      }, PIXEL_PREVIEW_THROTTLE_MS - elapsed);
    },
    [flushPreview],
  );

  useEffect(
    () => () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (event: WheelEvent) => {
      if (!routePixelCanvasWheel(host, event)) return;
      publishViewport(visibleCanvasViewport(host, scale, viewCanvas));
    };
    host.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => host.removeEventListener("wheel", onWheel, { capture: true });
  }, [publishViewport, scale, viewCanvas]);

  const handlePlayingChange = useCallback((widgetId: string, playing: boolean) => {
    setPlayingWidgetId((current) => {
      if (playing) return widgetId;
      return current === widgetId ? null : current;
    });
  }, []);

  const handleMarkGuidesChange = useCallback((guides: MarkLineGuide[] | null) => {
    const next = guides ?? [];
    setMarkGuides((previous) =>
      markLineGuidesEqual(previous, next) ? previous : next,
    );
  }, []);

  const shouldRevertCommit = useCallback(
    (widgetId: string, finalRect: PixelRect, startRect: PixelRect) => {
      const widget = activeLayout.widgets.find((item) => item.id === widgetId);
      if (widget && widget.type !== "tabs" && !widget.parentTabsId) {
        const host = resolveTabHostForWidgetDrop(activeLayout, finalRect, {
          intent: tabInsertIntent,
          dropBufferPx: TAB_PALETTE_DROP_BUFFER_PX,
        });
        if (host && host.id !== widgetId) return false;
      }
      return shouldRevertPixelDragCommit(
        finalRect,
        startRect,
        activeLayout.widgets
          .filter((item) => item.id !== widgetId)
          .map((item) => widgetRect(item)),
        gapRuntime.collisionOverlapBufferPx,
        gapRuntime.collisionGapPx,
      );
    },
    [
      activeLayout,
      gapRuntime.collisionGapPx,
      gapRuntime.collisionOverlapBufferPx,
      tabInsertIntent,
    ],
  );

  const handleCommit = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      pendingPreviewRef.current = null;
      setShapeDragWidget(null);

      const absorbHost = resolveTabHostForWidgetDrop(activeLayout, widgetRect(widget), {
        intent: tabInsertIntent,
        dropBufferPx: TAB_PALETTE_DROP_BUFFER_PX,
      });
      const absorbed = tryAbsorbTopLevelWidgetIntoTab(activeLayout, widget, {
        intent: tabInsertIntent,
        dropBufferPx: TAB_PALETTE_DROP_BUFFER_PX,
      });
      if (absorbed) {
        onLayoutChange(absorbed);
        clearPreviewChrome(absorbed);
        onSelect?.(absorbHost?.id ?? widget.id, false);
        return;
      }

      const nextLayout = resolveActiveAt(widget);
      onLayoutChange(nextLayout);
      clearPreviewChrome(nextLayout);
    },
    [
      activeLayout,
      clearPreviewChrome,
      onLayoutChange,
      onSelect,
      resolveActiveAt,
      tabInsertIntent,
    ],
  );

  const handleCancel = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    pendingPreviewRef.current = null;
    setShapeDragWidget(null);
    clearPreviewChrome();
  }, [clearPreviewChrome]);

  const handleDragAutoScroll = useCallback(
    (event: PointerEvent) => {
      const host = hostRef.current;
      if (!host) return 0;
      const delta = autoScrollPixelCanvasHost(host, event.clientY);
      if (delta !== 0) {
        publishViewport(visibleCanvasViewport(host, scale, viewCanvas));
      }
      return delta;
    },
    [publishViewport, scale, viewCanvas],
  );

  const resolveClientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return null;
      return clientPointToCanvasFromStage(stage, clientX, clientY, scale);
    },
    [scale],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onPaletteDrop && !onTabPaletteDrop) return;
      if (!isPaletteDragEvent(event) && !paletteDragActive) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setPaletteDragOver(true);
      const point = resolveClientToCanvas(event.clientX, event.clientY);
      if (point) setPaletteDragPoint(point);
    },
    [onPaletteDrop, onTabPaletteDrop, paletteDragActive, resolveClientToCanvas],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setPaletteDragOver(false);
    setPaletteDragPoint(null);
  }, []);

  const handleSelect = useCallback(
    (widgetId: string, additive: boolean) => {
      preservePixelCanvasHostScroll(() => onSelect?.(widgetId, additive));
    },
    [onSelect],
  );

  const handleBlankPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClearSelection?.();
    },
    [onClearSelection],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onPaletteDrop && !onTabPaletteDrop) return;
      event.preventDefault();
      setPaletteDragOver(false);
      setPaletteDragPoint(null);
      const payload = readPaletteDragPayload(event.nativeEvent);
      const point = resolveClientToCanvas(event.clientX, event.clientY);
      if (!payload || !point) return;

      const tabsHost = findTabsHostAtPoint(
        activeLayout.widgets,
        point,
        TAB_PALETTE_DROP_BUFFER_PX,
      );
      const tabsId =
        tabsHost?.id ??
        (tabInsertIntent?.tabsWidgetId &&
        activeLayout.widgets.some(
          (w) => w.id === tabInsertIntent.tabsWidgetId && w.type === "tabs",
        )
          ? tabInsertIntent.tabsWidgetId
          : null);

      if (tabsId && onTabPaletteDrop) {
        onTabPaletteDrop(tabsId, payload);
        return;
      }
      onPaletteDrop?.(payload, point, event.nativeEvent);
    },
    [
      activeLayout.widgets,
      onPaletteDrop,
      onTabPaletteDrop,
      resolveClientToCanvas,
      tabInsertIntent,
    ],
  );

  const handleTabChildExtractEnd = useCallback(
    (widgetId: string, point: PixelPoint) => {
      if (!onTabChildUnpark) return;
      if (!canUnparkTabChildAtPoint(activeLayout, widgetId, point, TAB_PALETTE_DROP_BUFFER_PX)) {
        return;
      }
      onTabChildUnpark(widgetId, point);
    },
    [activeLayout, onTabChildUnpark],
  );

  return (
    <TabChildExtractProvider
      onExtractEnd={handleTabChildExtractEnd}
      resolveCanvasPoint={resolveClientToCanvas}
    >
    <div
      ref={hostRef}
      className={cn(
        "pixel-canvas-host relative h-full min-h-0 w-full overflow-y-auto",
        scrollX ? "overflow-x-auto" : "overflow-x-hidden",
        centerContent && "flex flex-col items-center",
        paletteDragOver && "dashboard-canvas-drop-active",
        className,
      )}
      data-testid="pixel-canvas-host"
      data-pixel-canvas-mode={mode}
      data-pixel-canvas-scale={scale}
      data-pixel-canvas-scroll-x={scrollX ? "true" : undefined}
      data-pixel-canvas-playing={playingWidgetId ?? undefined}
      style={{
        ...artboardStyle,
        "--pixel-canvas-scale": scale,
      } as CSSProperties}
      onScroll={(event) => {
        publishViewport(visibleCanvasViewport(event.currentTarget, scale, viewCanvas));
      }}
      onPointerDown={handleBlankPointerDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={contentRef}
        data-testid="pixel-canvas-content"
        className="relative shrink-0"
        style={{ width: contentSize.width, height: contentSize.height }}
        onPointerDown={handleBlankPointerDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <PixelCanvasScaleProvider scale={scale}>
        <PixelCanvasInteractionProvider
          interaction={playingWidgetId ? { widgetId: playingWidgetId } : null}
        >
        <TabPaletteDropTargetProvider
          targetTabsId={
            !isDraggingTabHost && (paletteDragActive || shapeDragWidget)
              ? activeTabDropTargetId
              : null
          }
        >
        <div
          ref={stageRef}
          id="editor-canvas-main"
          data-testid="pixel-canvas-stage"
          className="editor-canvas-main pixel-canvas-stage absolute top-0 origin-top-left overflow-visible"
          style={{
            left: stageLeft,
            width: viewCanvas.width,
            height: viewCanvas.height,
            transform: `scale(${scale})`,
          }}
          onPointerDown={handleBlankPointerDown}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            data-testid="pixel-canvas-artboard"
            className="pointer-events-none absolute inset-0 z-0 shadow-theme-sm ring-1 ring-gray-200 dark:ring-gray-700"
            style={artboardStyle}
            aria-hidden
          />
          {showAuxGrid ? (
            <div
              data-testid="pixel-canvas-aux-grid"
              className="dashboard-edit-aux-grid pointer-events-none absolute inset-0 z-[1]"
              style={auxGridStyle}
              aria-hidden
            />
          ) : null}
          {visibleTopLevelWidgets.map((widget) => (
              <PixelShape
                key={widget.id}
                widget={widget}
                canvas={viewCanvas}
                scale={scale}
                shapeGapPx={gapRuntime.snapGapPx}
                mode={mode}
                selected={mode === "edit" && Boolean(selectedIds?.has(widget.id))}
                onSelect={handleSelect}
                onPreview={mode === "edit" ? handlePreview : undefined}
                onCommit={handleCommit}
                onCancel={handleCancel}
                shouldRevertCommit={(finalRect, startRect) =>
                  shouldRevertCommit(widget.id, finalRect, startRect)
                }
                onPlayingChange={(playing) => handlePlayingChange(widget.id, playing)}
                onDragAutoScroll={mode === "edit" ? handleDragAutoScroll : undefined}
                onMarkGuidesChange={
                  mode === "edit" ? handleMarkGuidesChange : undefined
                }
                markLinesEnabled={showAuxGrid}
                snapTargets={topLevelWidgets.filter((item) => item.id !== widget.id)}
                viewport={visibleViewport}
                otherWidgets={topLevelWidgets.filter((item) => item.id !== widget.id)}
                widgetActions={widgetActions}
                styleConfig={widgetChromeStyle}
                registerPreviewSync={mode === "edit" ? registerPreviewSync : undefined}
              >
                <PixelWidgetSlot
                  widget={widget}
                  renderWidget={renderWidget}
                  contentRevision={widgetContentRevision?.(widget) ?? widget.id}
                />
              </PixelShape>
            ))}
          {showTabPaletteDropZones ? (
            <TabPaletteDropZones
              tabs={tabHosts}
              hitBufferPx={TAB_PALETTE_DROP_BUFFER_PX}
              visualBufferPx={TAB_PALETTE_DROP_VISUAL_BUFFER_PX}
              activeTabsId={activeTabDropTargetId}
              onTabDrop={onTabPaletteDrop ?? (() => {})}
              onTabHover={reportTabHover}
            />
          ) : null}
          {showMarkLines ? (
            <PixelMarkLineOverlay guides={markGuides} canvas={viewCanvas} />
          ) : null}
          </div>
        </TabPaletteDropTargetProvider>
        </PixelCanvasInteractionProvider>
        </PixelCanvasScaleProvider>
      </div>
    </div>
    </TabChildExtractProvider>
  );
}
