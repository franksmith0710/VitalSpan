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
  onChange?: (widget: PixelLayoutWidget) => void;
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

export function PixelShape({
  widget,
  canvas,
  scale,
  mode,
  selected,
  children,
  onSelect,
  onChange,
  onMore,
}: PixelShapeProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<ActiveInteraction | null>(null);
  const displayRef = useRef(widgetRect(widget));
  const [display, setDisplay] = useState(displayRef.current);

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
    return applyPixelInteraction(
      active.startRect,
      screenDeltaToCanvas(screenDelta, scale),
      active.kind,
      canvas,
    );
  };

  const startInteraction = (
    event: PointerEvent<HTMLElement>,
    kind: PixelInteractionKind,
  ) => {
    if (mode !== "edit" || event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(widget.id, event.shiftKey);
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
    setDisplayRect(finalRect);
    if (outerRef.current?.hasPointerCapture(event.pointerId)) {
      outerRef.current.releasePointerCapture(event.pointerId);
    }
    if (commit) onChange?.(withRect(widget, finalRect));
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
    const next = applyPixelInteraction(displayRef.current, delta, kind, canvas);
    setDisplayRect(next);
    onChange?.(withRect(widget, next));
  };

  return (
    <div
      ref={outerRef}
      data-testid={`pixel-shape-${widget.id}`}
      className={cn(
        "pixel-shape-outer absolute border",
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
        if (next) setDisplayRect(next);
      }}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
      onLostPointerCapture={(event) => finish(event, true, true)}
    >
      <div
        className="pixel-shape-inner h-full min-h-0 overflow-hidden bg-white p-3 dark:bg-gray-900"
        data-pixel-no-drag
        onPointerDown={(event) => {
          if (mode === "edit") onSelect?.(widget.id, event.shiftKey);
        }}
      >
        {children}
      </div>

      {mode === "edit" && selected ? (
        <>
          <div
            data-testid={`pixel-edit-bar-${widget.id}`}
            className="pixel-shape-edit-bar absolute top-1/2 flex flex-col items-center rounded-lg border border-gray-200 bg-white py-1 shadow-theme-sm dark:border-gray-700 dark:bg-gray-900"
            style={{
              left: -40 / scale,
              width: 32,
              transform: `translateY(-50%) scale(${1 / scale})`,
              transformOrigin: "right center",
            }}
          >
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 cursor-grab text-gray-500 active:cursor-grabbing dark:text-gray-400"
              aria-label="拖动组件"
              onPointerDown={(event) => startInteraction(event, "move")}
              onKeyDown={(event) => handleKeyboardInteraction(event, "move")}
            >
              <GripVertical className="size-4" aria-hidden />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 text-gray-500 dark:text-gray-400"
              aria-label="更多操作"
              onClick={() => onMore?.(widget.id)}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </IconButton>
          </div>
          {RESIZE_DIRECTIONS.map((direction) => (
            <IconButton
              key={direction}
              type="button"
              variant="ghost"
              size="sm"
              data-testid={`pixel-resize-${direction}`}
              className={cn(
                "absolute z-10 flex items-center justify-center rounded-none p-0",
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
          ))}
        </>
      ) : null}
    </div>
  );
}
