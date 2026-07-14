import {
  useCallback,
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
import type { ScaleMode } from "../dashboardStyleConfig";
import { resolvePixelCollisions } from "./collisionLayout";
import type { PixelRect } from "./geometry";
import { clientPointToCanvas, resolvePixelCanvasMeasureElement, scaledCanvasMetrics } from "./geometry";
import { PixelShape } from "./PixelShape";
import type { PixelWidgetActions } from "./PixelShapeActionRail";
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
  pixelGutter?: number;
};

export const PIXEL_CANVAS_GUTTER = 0;

export const PIXEL_CANVAS_MIN_HEIGHT = 320;

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
}: PixelCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [previewLayout, setPreviewLayout] = useState<DashboardLayoutV2 | null>(null);
  const [paletteDragOver, setPaletteDragOver] = useState(false);
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

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measureEl = resolvePixelCanvasMeasureElement(host);
    const update = () => {
      const metrics = scaledCanvasMetrics(
        measureEl.clientWidth,
        measureEl.clientHeight,
        viewCanvas.width,
        viewCanvas.height,
        pixelGutter,
        scaleMode,
      );
      setScale((previous) =>
        Math.abs(previous - metrics.scale) < 0.0001 ? previous : metrics.scale,
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
  }, [onViewportChange, viewCanvas, scaleMode, pixelGutter]);

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

  const handlePreview = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      setPreviewLayout(resolveActive(widget));
    },
    [onLayoutChange, resolveActive],
  );

  const handleCommit = useCallback(
    (widget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      setPreviewLayout(null);
      onLayoutChange(resolveActive(widget));
    },
    [onLayoutChange, resolveActive],
  );

  const handleCancel = useCallback(() => {
    setPreviewLayout(null);
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
      const point = clientPointToCanvas(host, event.clientX, event.clientY, scale, pixelGutter);
      onPaletteDrop(payload, point);
    },
    [onPaletteDrop, scale],
  );

  return (
    <div
      ref={hostRef}
      className={cn(
        "pixel-canvas-host relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto",
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
        className="relative"
        style={{ width: contentSize.width, height: contentSize.height }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <PixelCanvasScaleProvider scale={scale}>
          <div
            data-testid="pixel-canvas-stage"
            className="pixel-canvas-stage absolute top-0 origin-top-left overflow-visible"
            style={{
              left: pixelGutter,
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
            {activeLayout.widgets.map((widget) => (
              <PixelShape
                key={widget.id}
                widget={widget}
                canvas={viewCanvas}
                scale={scale}
                mode={mode}
                selected={mode === "edit" && Boolean(selectedIds?.has(widget.id))}
                onSelect={onSelect}
                onPreview={handlePreview}
                onCommit={handleCommit}
                onCancel={handleCancel}
                viewport={visibleViewport}
                widgetActions={widgetActions}
              >
                {renderWidget(widget)}
              </PixelShape>
            ))}
          </div>
        </PixelCanvasScaleProvider>
      </div>
    </div>
  );
}
