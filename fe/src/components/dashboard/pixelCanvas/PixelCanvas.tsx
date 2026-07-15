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
import type { ScaleMode, DashboardStyleConfig } from "../dashboardStyleConfig";
import {
  canvasArtboardStyleFingerprint,
  hasUserCanvasBackground,
  pickWidgetDashboardStyle,
  resolveArtboardStyle,
  widgetDashboardStyleFingerprint,
} from "../dashboardStyleConfig";
import { resolveComponentGapRuntime } from "../componentGapRuntime";
import { mergeAuxiliaryGridIntoSurface, resolveDashboardChrome } from "../dashboardChromeConfig";
import { resolvePixelCollisions, widgetRect } from "./collisionLayout";
import type { PixelRect } from "./geometry";
import { clientPointToCanvas, resolvePixelCanvasMeasureElement, resolveScaleDesignHeight, scaledCanvasMetrics } from "./geometry";
import { PixelShape } from "./PixelShape";
import type { PixelWidgetActions } from "./PixelShapeActionRail";
import { PixelMarkLineOverlay } from "./PixelMarkLineOverlay";
import { markLineGuidesEqual } from "./markLineGuidesEqual";
import type { MarkLineGuide } from "./pixelMarkLine";
import { PixelWidgetSlot } from "./PixelWidgetSlot";
import { createPixelShapePreviewRegistry } from "./pixelShapePreviewRegistry";
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
  onPaletteDrop?: (type: PaletteDragPayload, point: { x: number; y: number }) => void;
  widgetActions?: PixelWidgetActions;
  className?: string;
  scaleMode?: ScaleMode;
  styleConfig?: DashboardStyleConfig;
  widgetContentRevision?: (widget: PixelLayoutWidget) => string;
};

export const PIXEL_CANVAS_GUTTER = 0;

export const PIXEL_CANVAS_MIN_HEIGHT = 320;

/** 邻组件推挤预览节流；位置经 DOM 直改，不再 setPreviewLayout */
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
  const lowest = layout.widgets.reduce((max, widget) => Math.max(max, widget.y + widget.height), 0);
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
  widgetActions,
  className,
  scaleMode = "canvas",
  styleConfig = {},
  widgetContentRevision,
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
  const previewThrottleRef = useRef(0);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPreviewRef = useRef<PixelLayoutWidget | null>(null);
  const [paletteDragOver, setPaletteDragOver] = useState(false);
  const [markGuides, setMarkGuides] = useState<MarkLineGuide[]>([]);
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
  const activeLayout = layout;
  const widgetChromeStyle = useMemo(
    () => pickWidgetDashboardStyle(styleConfig),
    [widgetDashboardStyleFingerprint(styleConfig)],
  );
  const chrome = resolveDashboardChrome(styleConfig);
  const gapRuntime = useMemo(
    () => resolveComponentGapRuntime(styleConfig, "pixel"),
    [styleConfig],
  );
  const showAuxGrid = mode === "edit" && chrome.showAuxiliaryGrid;
  const scheme = styleConfig.colorScheme ?? "light";
  const artboardStyle = useMemo(
    () =>
      mergeAuxiliaryGridIntoSurface(
        resolveArtboardStyle(styleConfig),
        scheme,
        showAuxGrid,
      ),
    [canvasArtboardStyleFingerprint(styleConfig), scheme, showAuxGrid],
  );
  const userArtboardBg = hasUserCanvasBackground(styleConfig);
  const viewCanvasHeight = useMemo(() => {
    const lowest = activeLayout.widgets.reduce(
      (max, widget) => Math.max(max, widget.y + widget.height),
      0,
    );
    return Math.max(PIXEL_CANVAS_MIN_HEIGHT, lowest);
  }, [activeLayout.widgets]);
  const viewCanvas = useMemo(
    () => ({ width: activeLayout.canvas.width, height: viewCanvasHeight }),
    [activeLayout.canvas.width, viewCanvasHeight],
  );
  const designCanvasHeight = useMemo(
    () => resolveScaleDesignHeight(activeLayout.canvas.height),
    [activeLayout.canvas.height],
  );

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measureEl = resolvePixelCanvasMeasureElement(host);

    const applyMetrics = () => {
      const metrics = scaledCanvasMetrics(
        measureEl.clientWidth,
        measureEl.clientHeight,
        viewCanvas.width,
        designCanvasHeight,
        viewCanvas.height,
        PIXEL_CANVAS_GUTTER,
        scaleMode,
      );
      setScale((previous) =>
        Math.abs(previous - metrics.scale) < 0.0001 ? previous : metrics.scale,
      );
      setStageLeft((previous) => (previous === metrics.stageLeft ? previous : metrics.stageLeft));
      setCenterContent((previous) =>
        previous === metrics.centerContent ? previous : metrics.centerContent,
      );
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
  }, [publishViewport, viewCanvas, designCanvasHeight, scaleMode]);

  const registerPreviewSync = useCallback(
    (widgetId: string, sync: (rect: PixelRect) => void) =>
      previewRegistryRef.current.register(widgetId, sync),
    [],
  );

  const clearPreviewChrome = useCallback(() => {
    stageRef.current?.style.removeProperty("height");
    contentRef.current?.style.removeProperty("width");
    contentRef.current?.style.removeProperty("height");
    previewRegistryRef.current.reset(
      layout.widgets.map((widget) => ({ id: widget.id, ...widgetRect(widget) })),
    );
  }, [layout.widgets]);

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
        measureEl.clientWidth,
        measureEl.clientHeight,
        layout.canvas.width,
        resolveScaleDesignHeight(nextLayout.canvas.height),
        viewHeight,
        PIXEL_CANVAS_GUTTER,
        scaleMode,
      );
      stage.style.height = `${viewHeight}px`;
      if (content) {
        content.style.width = `${metrics.contentWidth}px`;
        content.style.height = `${metrics.contentHeight}px`;
      }
    },
    [layout.canvas.width, scaleMode],
  );

  const resolveActiveAt = useCallback(
    (widget: PixelLayoutWidget) =>
      resolvePixelCollisions(
        layout,
        widget.id,
        {
          x: widget.x,
          y: widget.y,
          width: widget.width,
          height: widget.height,
        },
        { gap: gapRuntime.collisionGapPx },
      ),
    [layout, gapRuntime.collisionGapPx],
  );

  const flushPreview = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      previewThrottleRef.current = Date.now();
      pendingPreviewRef.current = null;
      const nextLayout = resolveActiveAt(widget);
      const positions = new Map(
        nextLayout.widgets.map((item) => [item.id, widgetRect(item)] as const),
      );
      previewRegistryRef.current.applyAll(positions);
      syncPreviewStageMetrics(nextLayout);
    },
    [onLayoutChange, resolveActiveAt, syncPreviewStageMetrics],
  );

  const handlePreview = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
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
    [onLayoutChange, flushPreview],
  );

  useEffect(
    () => () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    },
    [],
  );

  const handleMarkGuidesChange = useCallback((guides: MarkLineGuide[] | null) => {
    const next = guides ?? [];
    setMarkGuides((previous) =>
      markLineGuidesEqual(previous, next) ? previous : next,
    );
  }, []);

  const handleCommit = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      pendingPreviewRef.current = null;
      clearPreviewChrome();
      onLayoutChange(resolveActiveAt(widget));
    },
    [onLayoutChange, resolveActiveAt, clearPreviewChrome],
  );

  const handleCancel = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    pendingPreviewRef.current = null;
    clearPreviewChrome();
  }, [clearPreviewChrome]);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onPaletteDrop || !isPaletteDragEvent(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setPaletteDragOver(true);
    },
    [onPaletteDrop],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setPaletteDragOver(false);
  }, []);

  const handleBlankPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClearSelection?.();
    },
    [onClearSelection],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onPaletteDrop) return;
      event.preventDefault();
      setPaletteDragOver(false);
      const payload = readPaletteDragPayload(event.nativeEvent);
      const host = hostRef.current;
      if (!payload || !host) return;
      const horizontalGutter =
        centerContent && contentSize.width > 0
          ? Math.max(0, (host.clientWidth - contentSize.width) / 2)
          : stageLeft;
      const point = clientPointToCanvas(
        host,
        event.clientX,
        event.clientY,
        scale,
        horizontalGutter,
      );
      onPaletteDrop(payload, point);
    },
    [onPaletteDrop, scale, stageLeft, centerContent, contentSize.width],
  );

  return (
    <div
      ref={hostRef}
      className={cn(
        "pixel-canvas-host dashboard-scroll relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto",
        centerContent && "flex flex-col items-center",
        paletteDragOver && "dashboard-canvas-drop-active",
        className,
      )}
      data-testid="pixel-canvas-host"
      data-pixel-canvas-scale={scale}
      style={{
        ...(userArtboardBg ? artboardStyle : undefined),
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
            data-testid={showAuxGrid ? "pixel-canvas-aux-grid" : "pixel-canvas-artboard"}
            className={cn(
              "pointer-events-none absolute inset-0 z-0 shadow-theme-sm ring-1 ring-gray-200 dark:ring-gray-700",
              showAuxGrid && "dashboard-edit-aux-grid",
            )}
            style={artboardStyle}
            aria-hidden
          />
          {activeLayout.widgets.map((widget) => (
              <PixelShape
                key={widget.id}
                widget={widget}
                canvas={viewCanvas}
                scale={scale}
                shapeGapPx={gapRuntime.snapGapPx}
                mode={mode}
                selected={mode === "edit" && Boolean(selectedIds?.has(widget.id))}
                onSelect={onSelect}
                onPreview={mode === "edit" ? handlePreview : undefined}
                onCommit={handleCommit}
                onCancel={handleCancel}
                onMarkGuidesChange={
                  mode === "edit" ? handleMarkGuidesChange : undefined
                }
                markLinesEnabled={showAuxGrid}
                snapTargets={layout.widgets.filter((item) => item.id !== widget.id)}
                viewport={visibleViewport}
                otherWidgets={layout.widgets.filter((item) => item.id !== widget.id)}
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
          {mode === "edit" && showAuxGrid ? (
            <PixelMarkLineOverlay guides={markGuides} canvas={viewCanvas} />
          ) : null}
          </div>
        </PixelCanvasScaleProvider>
      </div>
    </div>
  );
}
