import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
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
import { resolveArtboardStyle } from "../dashboardStyleConfig";
import { resolvePixelCollisions } from "./collisionLayout";
import type { PixelRect } from "./geometry";
import { clientPointToCanvas, resolvePixelCanvasMeasureElement, resolveScaleDesignHeight, scaledCanvasMetrics } from "./geometry";
import { PixelShape } from "./PixelShape";
import type { PixelWidgetActions } from "./PixelShapeActionRail";
import { PixelMarkLineOverlay } from "./PixelMarkLineOverlay";
import type { MarkLineGuide } from "./pixelMarkLine";
import { PixelCanvasScaleProvider } from "./PixelCanvasScaleContext";
import {
  PixelCanvasInteractionProvider,
  type PixelCanvasInteraction,
} from "./PixelCanvasInteractionContext";

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
  pixelGutter?: number;
  styleConfig?: DashboardStyleConfig;
};

export const PIXEL_CANVAS_GUTTER = 0;

export const PIXEL_CANVAS_MIN_HEIGHT = 320;

/** 邻组件推挤预览节流（对标 DE onDragging/onResizing 10ms debounce） */
export const PIXEL_PREVIEW_THROTTLE_MS = 16;

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
  pixelGutter = PIXEL_CANVAS_GUTTER,
  styleConfig = {},
}: PixelCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [stageLeft, setStageLeft] = useState(0);
  const [centerContent, setCenterContent] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<DashboardLayoutV2 | null>(null);
  const [interaction, setInteraction] = useState<PixelCanvasInteraction>(null);
  const previewThrottleRef = useRef(0);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPreviewRef = useRef<PixelLayoutWidget | null>(null);
  const [paletteDragOver, setPaletteDragOver] = useState(false);
  const [markGuides, setMarkGuides] = useState<MarkLineGuide[]>([]);
  const [visibleViewport, setVisibleViewport] = useState<PixelRect>({
    x: 0,
    y: 0,
    width: layout.canvas.width,
    height: layout.canvas.height,
  });
  const activeLayout = previewLayout ?? layout;
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
    const update = () => {
      const metrics = scaledCanvasMetrics(
        measureEl.clientWidth,
        measureEl.clientHeight,
        viewCanvas.width,
        designCanvasHeight,
        viewCanvas.height,
        pixelGutter,
        scaleMode,
      );
      setScale((previous) =>
        Math.abs(previous - metrics.scale) < 0.0001 ? previous : metrics.scale,
      );
      setStageLeft((previous) => (previous === metrics.stageLeft ? previous : metrics.stageLeft));
      setCenterContent((previous) =>
        previous === metrics.centerContent ? previous : metrics.centerContent,
      );
      setContentSize((previous) =>
        Math.abs(previous.width - metrics.contentWidth) < 1 &&
        Math.abs(previous.height - metrics.contentHeight) < 1
          ? previous
          : { width: metrics.contentWidth, height: metrics.contentHeight },
      );
      onViewportChange?.(visibleCanvasViewport(host, metrics.scale, viewCanvas));
      setVisibleViewport(visibleCanvasViewport(host, metrics.scale, viewCanvas));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(measureEl);
    return () => observer.disconnect();
  }, [onViewportChange, viewCanvas, designCanvasHeight, scaleMode, pixelGutter]);

  const resolveActive = useCallback(
    (widget: PixelLayoutWidget) =>
      resolvePixelCollisions(layout, widget.id, {
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
      }),
    [layout],
  );

  const flushPreview = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      previewThrottleRef.current = Date.now();
      pendingPreviewRef.current = null;
      setPreviewLayout(resolveActive(widget));
    },
    [onLayoutChange, resolveActive],
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

  const handleInteractionChange = useCallback((widgetId: string | null) => {
    setInteraction(widgetId ? { widgetId } : null);
  }, []);

  const handleCommit = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      pendingPreviewRef.current = null;
      setPreviewLayout(null);
      setInteraction(null);
      onLayoutChange(resolveActive(widget));
    },
    [onLayoutChange, resolveActive],
  );

  const handleCancel = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    pendingPreviewRef.current = null;
    setPreviewLayout(null);
    setInteraction(null);
  }, []);

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
          : pixelGutter;
      const point = clientPointToCanvas(
        host,
        event.clientX,
        event.clientY,
        scale,
        horizontalGutter,
      );
      onPaletteDrop(payload, point);
    },
    [onPaletteDrop, scale, pixelGutter, centerContent, contentSize.width],
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
      style={{ "--pixel-canvas-scale": scale } as CSSProperties}
      onScroll={(event) => {
        const next = visibleCanvasViewport(event.currentTarget, scale, viewCanvas);
        onViewportChange?.(next);
        setVisibleViewport(next);
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClearSelection?.();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        data-testid="pixel-canvas-content"
        className="relative shrink-0"
        style={{ width: contentSize.width, height: contentSize.height }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <PixelCanvasScaleProvider scale={scale}>
        <PixelCanvasInteractionProvider interaction={interaction}>
        <div
          data-testid="pixel-canvas-stage"
          className="pixel-canvas-stage absolute top-0 origin-top-left overflow-visible"
          style={{
            left: stageLeft,
            width: viewCanvas.width,
            height: viewCanvas.height,
            transform: `scale(${scale})`,
          }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClearSelection?.();
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            data-testid="pixel-canvas-artboard"
            className="pointer-events-none absolute inset-0 z-0 shadow-theme-sm ring-1 ring-gray-200 dark:ring-gray-700"
            style={resolveArtboardStyle(styleConfig)}
            aria-hidden
          />
          {mode === "edit" ? (
            <PixelMarkLineOverlay guides={markGuides} canvas={viewCanvas} />
          ) : null}
          {activeLayout.widgets.map((widget) => (
              <PixelShape
                key={widget.id}
                widget={widget}
                canvas={viewCanvas}
                scale={scale}
                mode={mode}
                selected={mode === "edit" && Boolean(selectedIds?.has(widget.id))}
                onSelect={onSelect}
                onPreview={mode === "edit" ? handlePreview : undefined}
                onCommit={handleCommit}
                onCancel={handleCancel}
                onInteractionChange={mode === "edit" ? handleInteractionChange : undefined}
                onMarkGuidesChange={
                  mode === "edit" ? (guides) => setMarkGuides(guides ?? []) : undefined
                }
                snapTargets={layout.widgets.filter((item) => item.id !== widget.id)}
                viewport={visibleViewport}
                otherWidgets={activeLayout.widgets.filter((item) => item.id !== widget.id)}
                widgetActions={widgetActions}
              >
                {renderWidget(widget)}
              </PixelShape>
            ))}
          </div>
        </PixelCanvasInteractionProvider>
        </PixelCanvasScaleProvider>
      </div>
    </div>
  );
}
