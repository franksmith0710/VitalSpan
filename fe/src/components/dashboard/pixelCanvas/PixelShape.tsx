import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
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
  pixelShapeZIndex,
  type PixelRect,
  type ResizeDirection,
} from "./geometry";
import { computeMarkLineSnap, markLineThreshold, type MarkLineGuide } from "./pixelMarkLine";
import {
  applyContentLiveScale,
  isResizeInteraction,
  resetContentLiveScale,
} from "./pixelShapeLiveResize";
import { PixelShapeActionRail, type PixelWidgetActions } from "./PixelShapeActionRail";
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
  onInteractionChange?: (widgetId: string | null) => void;
  onMarkGuidesChange?: (guides: MarkLineGuide[] | null) => void;
  viewport?: PixelRect;
  /** 已提交 layout 中的邻组件，供 mark-line 吸附锚点（不随 preview 推挤跳动） */
  snapTargets?: Array<Pick<PixelRect, "x" | "y" | "width" | "height">>;
  otherWidgets?: Array<Pick<PixelRect, "x" | "y" | "width" | "height">>;
  widgetActions?: PixelWidgetActions;
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

function paintRectToDom(el: HTMLDivElement, rect: PixelRect, zIndex: number) {
  el.style.left = `${rect.x}px`;
  el.style.top = `${rect.y}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.zIndex = String(zIndex);
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
  onInteractionChange,
  onMarkGuidesChange,
  viewport,
  snapTargets,
  otherWidgets,
  widgetActions,
}: PixelShapeProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const contentBaseRef = useRef<PixelRect | null>(null);
  const activeRef = useRef<ActiveInteraction | null>(null);
  const displayRef = useRef(widgetRect(widget));
  const [display, setDisplay] = useState(displayRef.current);
  const [hint, setHint] = useState<string | null>(null);
  const [isLiveResizing, setIsLiveResizing] = useState(false);

  useEffect(() => {
    if (activeRef.current) return;
    const next = widgetRect(widget);
    displayRef.current = next;
    setDisplay(next);
  }, [widget]);

  const setDisplayRect = (next: PixelRect, syncReact = true) => {
    displayRef.current = next;
    if (outerRef.current) {
      paintRectToDom(
        outerRef.current,
        next,
        pixelShapeZIndex(widget.order, mode === "edit" && selected),
      );
    }
    if (syncReact) setDisplay(next);
  };

  useLayoutEffect(() => {
    if (!activeRef.current || !outerRef.current) return;
    paintRectToDom(
      outerRef.current,
      displayRef.current,
      pixelShapeZIndex(widget.order, mode === "edit" && selected),
    );
  });

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
    if (!onMarkGuidesChange) return next;
    const markTargets = snapTargets ?? otherWidgets ?? [];
    const snapped = computeMarkLineSnap(next, markTargets, {
      threshold: markLineThreshold(scale),
      dragDir: {
        isRightward: event.clientX >= active.startClient.x,
        isDownward: event.clientY >= active.startClient.y,
      },
      canvas,
    });
    onMarkGuidesChange(snapped.guides.length > 0 ? snapped.guides : null);
    return snapped.rect;
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
    if (isResizeInteraction(kind) && innerRef.current) {
      contentBaseRef.current = {
        x: 0,
        y: 0,
        width: innerRef.current.offsetWidth || displayRef.current.width,
        height: innerRef.current.offsetHeight || displayRef.current.height,
      };
      setIsLiveResizing(true);
    } else {
      contentBaseRef.current = null;
      setIsLiveResizing(false);
    }
    onInteractionChange?.(widget.id);
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
    contentBaseRef.current = null;
    resetContentLiveScale(innerRef.current);
    setIsLiveResizing(false);
    onInteractionChange?.(null);
    setHint(null);
    onMarkGuidesChange?.(null);
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
          ? "pixel-shape-selected z-[1] border-brand-500"
          : "border-gray-200/90 dark:border-gray-700/80",
      )}
      style={{
        left: display.x,
        top: display.y,
        width: display.width,
        height: display.height,
        zIndex: pixelShapeZIndex(widget.order, mode === "edit" && selected),
      }}
      onPointerMove={(event) => {
        const active = activeRef.current;
        const next = rectForEvent(event);
        if (!next || !active) return;
        displayRef.current = next;
        if (outerRef.current) {
          paintRectToDom(
            outerRef.current,
            next,
            pixelShapeZIndex(widget.order, mode === "edit" && selected),
          );
        }
        if (
          isResizeInteraction(active.kind) &&
          innerRef.current &&
          contentBaseRef.current
        ) {
          applyContentLiveScale(innerRef.current, contentBaseRef.current, next);
        }
        if (active.kind === "move") {
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
          className="pixel-shape-drag-rail absolute inset-x-0 top-0 z-20 flex cursor-grab touch-none select-none items-center gap-1.5 border-b border-brand-200/80 bg-brand-50/95 px-2.5 font-medium text-brand-700 active:cursor-grabbing dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
          onPointerDown={(event) => startInteraction(event, "move")}
          onKeyDown={(event) => handleKeyboardInteraction(event, "move")}
          role="group"
          aria-label="拖动组件"
        >
          <GripVertical className="size-4 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{widget.title}</span>
        </div>
      ) : null}
      {mode === "edit" && selected && widgetActions && viewport ? (
        <PixelShapeActionRail
          widget={widget}
          scale={scale}
          viewport={viewport}
          otherWidgets={otherWidgets}
          actions={widgetActions}
        />
      ) : null}
      <PixelShapeInteractionProvider value={startInteraction}>
        <div
          ref={innerRef}
          className={cn(
            "pixel-shape-inner dashboard-widget-surface h-full min-h-0 overflow-hidden bg-white dark:bg-gray-900",
            mode === "edit" && selected && "pixel-shape-inner--with-rail",
            isLiveResizing && "pixel-shape-inner--live-resize",
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
