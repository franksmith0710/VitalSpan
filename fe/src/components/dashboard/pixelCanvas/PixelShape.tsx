import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardCanvas, PixelLayoutWidget } from "../layoutUtils";
import {
  applyPixelInteraction,
  RESIZE_CURSORS,
  RESIZE_DIRECTIONS,
  RESIZE_LABELS,
  screenDeltaToCanvas,
  type PixelInteractionKind,
  type PixelRect,
  type ResizeDirection,
} from "./geometry";
import { PixelShapeInteractionProvider } from "./PixelShapeInteractionContext";

type ActiveInteraction = {
  pointerId: number;
  kind: PixelInteractionKind;
  startClient: { x: number; y: number };
  startRect: PixelRect;
};

type PixelShapeProps = {
  widget: PixelLayoutWidget;
  canvas: DashboardCanvas;
  scale: number;
  mode: "edit" | "view";
  selected: boolean;
  children: ReactNode;
  onSelect?: (widgetId: string, additive: boolean) => void;
  onPreview?: (widget: PixelLayoutWidget) => void;
  onCommit?: (widget: PixelLayoutWidget) => void;
  onCancel?: (widgetId: string) => void;
  onMore?: (widgetId: string) => void;
};

const HANDLE_POSITION: Record<ResizeDirection, string> = {
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2",
  e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
  s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
  w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
};

function widgetRect(widget: PixelLayoutWidget): PixelRect {
  return {
    x: widget.x,
    y: widget.y,
    width: widget.width,
    height: widget.height,
  };
}

function withRect(widget: PixelLayoutWidget, rect: PixelRect): PixelLayoutWidget {
  return { ...widget, ...rect };
}

function keyboardDelta(event: KeyboardEvent): { x: number; y: number } | null {
  const step = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowLeft") return { x: -step, y: 0 };
  if (event.key === "ArrowRight") return { x: step, y: 0 };
  if (event.key === "ArrowUp") return { x: 0, y: -step };
  if (event.key === "ArrowDown") return { x: 0, y: step };
  return null;
}

function boundaryHint(
  start: PixelRect,
  delta: PixelRect,
  next: PixelRect,
  kind: PixelInteractionKind,
): string | null {
  if (kind === "move") {
    if (delta.x > 0 && next.x < start.x + delta.x) return "已到画布右边界";
    if (delta.x < 0 && next.x > start.x + delta.x) return "已到画布左边界";
    if (delta.y < 0 && next.y > start.y + delta.y) return "已到画布顶部";
    return null;
  }
  if (kind.includes("e") && next.width < start.width + delta.width) return "已到画布右边界";
  if (kind.includes("w") && next.x > start.x + delta.x) return "已到画布左边界";
  if (kind.includes("n") && next.y > start.y + delta.y) return "已到画布顶部";
  return null;
}

export function PixelShape({
  widget,
  canvas,
  scale,
  mode,
  selected,
  children,
  onSelect,
  onPreview,
  onCommit,
  onCancel,
  onMore,
}: PixelShapeProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<ActiveInteraction | null>(null);
  const displayRef = useRef(widgetRect(widget));
  const [display, setDisplay] = useState(displayRef.current);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (activeRef.current) return;
    const next = widgetRect(widget);
    displayRef.current = next;
    setDisplay(next);
  }, [widget]);

  const setDisplayRect = (next: PixelRect) => {
    displayRef.current = next;
    setDisplay(next);
  };

  const rectForEvent = (event: PointerEvent<HTMLDivElement>): PixelRect | null => {
    const active = activeRef.current;
    if (!active || active.pointerId !== event.pointerId) return null;
    const screenDelta = {
      x: event.clientX - active.startClient.x,
      y: event.clientY - active.startClient.y,
    };
    const delta = screenDeltaToCanvas(screenDelta, scale);
    const next = applyPixelInteraction(active.startRect, delta, active.kind, canvas, {
      allowBottomGrowth: true,
    });
    setHint(
      boundaryHint(
        active.startRect,
        { x: delta.x, y: delta.y, width: next.width - active.startRect.width, height: next.height - active.startRect.height },
        next,
        active.kind,
      ),
    );
    return next;
  };

  const startInteraction = (
    event: PointerEvent<HTMLElement>,
    kind: PixelInteractionKind,
  ) => {
    if (mode !== "edit" || event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(widget.id, event.shiftKey);
    setHint(null);
    activeRef.current = {
      pointerId: event.pointerId,
      kind,
      startClient: { x: event.clientX, y: event.clientY },
      startRect: displayRef.current,
    };
    outerRef.current?.setPointerCapture(event.pointerId);
  };

  const finish = (
    event: PointerEvent<HTMLDivElement>,
    commit: boolean,
    useCurrentRect = false,
  ) => {
    const active = activeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const finalRect = commit
      ? useCurrentRect
        ? displayRef.current
        : (rectForEvent(event) ?? displayRef.current)
      : widgetRect(widget);
    activeRef.current = null;
    setHint(null);
    setDisplayRect(finalRect);
    if (outerRef.current?.hasPointerCapture(event.pointerId)) {
      outerRef.current.releasePointerCapture(event.pointerId);
    }
    if (commit) onCommit?.(withRect(widget, finalRect));
    else onCancel?.(widget.id);
  };

  const handleKeyboardInteraction = (
    event: KeyboardEvent<HTMLElement>,
    kind: PixelInteractionKind,
  ) => {
    const delta = keyboardDelta(event);
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(widget.id, event.shiftKey);
    const next = applyPixelInteraction(displayRef.current, delta, kind, canvas, {
      allowBottomGrowth: true,
    });
    setDisplayRect(next);
    onCommit?.(withRect(widget, next));
  };

  return (
    <div
      ref={outerRef}
      data-testid={`pixel-shape-${widget.id}`}
      className={cn(
        "pixel-shape-outer absolute border touch-none select-none",
        mode === "edit" && selected
          ? "pixel-shape-selected border-brand-500"
          : "border-transparent",
      )}
      style={{
        left: display.x,
        top: display.y,
        width: display.width,
        height: display.height,
        zIndex: widget.order,
      }}
      onPointerMove={(event) => {
        const next = rectForEvent(event);
        if (next) {
          setDisplayRect(next);
          onPreview?.(withRect(widget, next));
        }
      }}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
      onLostPointerCapture={(event) => finish(event, true, true)}
    >
      {hint ? (
        <p className="sr-only" role="status" data-testid="pixel-boundary-hint">
          {hint}
        </p>
      ) : null}
      {mode === "edit" && selected ? (
        <div
          data-testid={`pixel-drag-rail-${widget.id}`}
          className="pixel-shape-drag-rail absolute inset-x-0 top-0 z-20 flex h-7 cursor-grab touch-none select-none items-center gap-1 border-b border-brand-200/80 bg-brand-50/95 px-2 text-theme-xs font-medium text-brand-700 active:cursor-grabbing dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
          onPointerDown={(event) => startInteraction(event, "move")}
          onKeyDown={(event) => handleKeyboardInteraction(event, "move")}
          role="group"
          aria-label="拖动组件"
        >
          <GripVertical className="size-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{widget.title}</span>
          {onMore ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-6 shrink-0 text-brand-700 dark:text-brand-300"
              aria-label="更多操作"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onMore(widget.id)}
            >
              <MoreHorizontal className="size-3.5" aria-hidden />
            </IconButton>
          ) : null}
        </div>
      ) : null}
      <PixelShapeInteractionProvider value={startInteraction}>
        <div
          className={cn(
            "pixel-shape-inner h-full min-h-0 overflow-hidden bg-white dark:bg-gray-900",
            mode === "edit" && selected && "pt-7",
          )}
          data-pixel-no-drag
          onPointerDown={(event) => {
            if (mode === "edit") onSelect?.(widget.id, event.shiftKey);
          }}
        >
          {children}
        </div>
      </PixelShapeInteractionProvider>

      {mode === "edit" && selected
        ? RESIZE_DIRECTIONS.map((direction) => (
            <IconButton
              key={direction}
              type="button"
              variant="ghost"
              size="sm"
              data-testid={`pixel-resize-${direction}`}
              className={cn(
                "absolute z-30 flex touch-none select-none items-center justify-center rounded-none p-0",
                HANDLE_POSITION[direction],
              )}
              style={{
                width: 20 / scale,
                height: 20 / scale,
                cursor: RESIZE_CURSORS[direction],
              }}
              aria-label={`调整组件大小：${RESIZE_LABELS[direction]}`}
              onPointerDown={(event) => startInteraction(event, direction)}
              onKeyDown={(event) => handleKeyboardInteraction(event, direction)}
            >
              <span
                data-testid={`pixel-resize-visual-${direction}`}
                className="rounded-sm border border-brand-500 bg-white dark:bg-gray-900"
                style={{ width: 12 / scale, height: 12 / scale }}
              />
            </IconButton>
          ))
        : null}
    </div>
  );
}
