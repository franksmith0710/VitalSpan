import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type {
  DashboardCanvas,
  DashboardLayoutV2,
  PixelLayoutWidget,
} from "../layoutUtils";
import type { PixelRect } from "./geometry";
import { PixelShape } from "./PixelShape";

type PixelCanvasProps = {
  mode: "edit" | "view";
  layout: DashboardLayoutV2;
  renderWidget: (widget: PixelLayoutWidget) => ReactNode;
  selectedIds?: Set<string>;
  onSelect?: (widgetId: string, additive: boolean) => void;
  onClearSelection?: () => void;
  onLayoutChange?: (layout: DashboardLayoutV2) => void;
  onMore?: (widgetId: string) => void;
  className?: string;
};

export const PIXEL_CANVAS_GUTTER = 48;

export function canvasScaleForHost(
  hostWidth: number,
  canvasWidth: number,
  gutter = PIXEL_CANVAS_GUTTER,
): number {
  if (hostWidth <= gutter || canvasWidth <= 0) return 1;
  return (hostWidth - gutter) / canvasWidth;
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
  onMore,
  className,
}: PixelCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      setScale(canvasScaleForHost(host.clientWidth, layout.canvas.width));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [layout.canvas.width]);

  const updateWidget = useCallback(
    (nextWidget: PixelLayoutWidget) => {
      if (!onLayoutChange) return;
      onLayoutChange({
        ...layout,
        widgets: layout.widgets.map((widget) =>
          widget.id === nextWidget.id ? nextWidget : widget,
        ),
      });
    },
    [layout, onLayoutChange],
  );

  return (
    <div
      ref={hostRef}
      className={cn(
        "pixel-canvas-host relative w-full overflow-auto",
        mode === "edit" && "min-h-[420px]",
        className,
      )}
      data-testid="pixel-canvas-host"
      data-pixel-canvas-scale={scale}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClearSelection?.();
      }}
      style={{ height: layout.canvas.height * scale }}
    >
      <div
        data-testid="pixel-canvas-stage"
        className="pixel-canvas-stage absolute top-0 origin-top-left"
        style={{
          left: PIXEL_CANVAS_GUTTER,
          width: layout.canvas.width,
          height: layout.canvas.height,
          transform: `scale(${scale})`,
        }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onClearSelection?.();
        }}
      >
        {layout.widgets.map((widget) => (
          <PixelShape
            key={widget.id}
            widget={widget}
            canvas={layout.canvas}
            scale={scale}
            mode={mode}
            selected={mode === "edit" && Boolean(selectedIds?.has(widget.id))}
            onSelect={onSelect}
            onChange={updateWidget}
            onMore={onMore}
          >
            {renderWidget(widget)}
          </PixelShape>
        ))}
      </div>
    </div>
  );
}
