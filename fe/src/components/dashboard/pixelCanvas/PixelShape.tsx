import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mergeChartTitleStyle, readChartRemark, readChartTitleVisible, resolveChartContentShellStyle, resolveWidgetShellStyle } from "@/lib/chartDeStyle";
import type { DashboardCanvas, PixelLayoutWidget } from "../layoutUtils";
import type { DashboardStyleConfig } from "../dashboardStyleConfig";
import { mergeTitleStyle } from "../dashboardStyleConfig";
import { resolveDashboardChrome } from "../dashboardChromeConfig";
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
import type { PixelShapePreviewSync } from "./pixelShapePreviewRegistry";
import { PixelShapeActionRail, type PixelWidgetActions } from "./PixelShapeActionRail";
import { WidgetShapeChrome } from "./WidgetShapeChrome";
import { PixelShapeInteractionProvider } from "./PixelShapeInteractionContext";
import { PixelShapePlayerProvider } from "./pixelShapePlayerContext";
import { isResizeInteraction } from "./pixelShapePlayer";
import { dispatchPixelShapeLiveResize } from "./pixelShapeLiveResize";
import { usePixelShapeDocumentDrag } from "./usePixelShapeDocumentDrag";

type ActiveInteraction = {
  pointerId: number;
  kind: PixelInteractionKind;
  startClient: { x: number; y: number };
  startRect: PixelRect;
  skipFirstMove: boolean;
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
  onMarkGuidesChange?: (guides: MarkLineGuide[] | null) => void;
  /** 与画布壳层 `chrome.showAuxiliaryGrid` 同步；关闭时不吸附、不画线 */
  markLinesEnabled?: boolean;
  viewport?: PixelRect;
  snapTargets?: Array<Pick<PixelRect, "x" | "y" | "width" | "height">>;
  otherWidgets?: Array<Pick<PixelRect, "x" | "y" | "width" | "height">>;
  widgetActions?: PixelWidgetActions;
  styleConfig?: DashboardStyleConfig;
  registerPreviewSync?: (widgetId: string, sync: PixelShapePreviewSync) => () => void;
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

function resolveShapeTitleState(
  widget: PixelLayoutWidget,
  styleConfig?: DashboardStyleConfig,
): {
  showTitle: boolean;
  titleStyle: CSSProperties;
  remark: { show: boolean; text: string };
} {
  if (widget.type === "chart") {
    return {
      showTitle: readChartTitleVisible(widget.chartConfig),
      titleStyle: mergeChartTitleStyle(
        styleConfig?.titleStyle,
        widget.chartConfig,
        styleConfig?.colorScheme ?? "light",
      ),
      remark: readChartRemark(widget.chartConfig),
    };
  }
  return {
    showTitle: true,
    titleStyle: mergeTitleStyle(styleConfig?.titleStyle),
    remark: { show: false, text: "" },
  };
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
  onMarkGuidesChange,
  markLinesEnabled = true,
  viewport,
  snapTargets,
  otherWidgets,
  widgetActions,
  styleConfig,
  registerPreviewSync,
}: PixelShapeProps) {
  const bindDocumentDrag = usePixelShapeDocumentDrag();
  const { showTitle, titleStyle, remark } = resolveShapeTitleState(widget, styleConfig);
  const onTitleChange = widgetActions?.onTitleChange;
  const chrome = resolveDashboardChrome(styleConfig);
  const shell =
    widget.type === "chart" && widget.chartConfig
      ? resolveChartContentShellStyle(
          styleConfig?.widgetStyle,
          widget.chartConfig,
          styleConfig?.colorScheme ?? "light",
        )
      : {
          outer: resolveWidgetShellStyle(styleConfig?.widgetStyle, styleConfig?.colorScheme ?? "light"),
          inner: {} as CSSProperties,
        };
  const activeRef = useRef<ActiveInteraction | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef(widgetRect(widget));
  const markGuideFrameRef = useRef<number | null>(null);
  const moveFrameRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{
    rect: PixelRect;
    event: PointerEvent;
    active: ActiveInteraction;
  } | null>(null);
  const [display, setDisplay] = useState(displayRef.current);
  const [hint, setHint] = useState<string | null>(null);
  const [isPlayer, setIsPlayer] = useState(false);

  const syncOuterStyle = (next: PixelRect) => {
    const el = outerRef.current;
    if (!el) return;
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
    el.style.width = `${next.width}px`;
    el.style.height = `${next.height}px`;
  };

  useEffect(() => {
    if (!registerPreviewSync) return;
    return registerPreviewSync(widget.id, (rect) => {
      displayRef.current = rect;
      syncOuterStyle(rect);
    });
  }, [widget.id, registerPreviewSync]);

  useEffect(() => {
    if (activeRef.current) return;
    const next = widgetRect(widget);
    displayRef.current = next;
    setDisplay(next);
    syncOuterStyle(next);
  }, [widget]);

  useEffect(
    () => () => {
      if (markGuideFrameRef.current !== null) {
        cancelAnimationFrame(markGuideFrameRef.current);
      }
      if (moveFrameRef.current !== null) {
        cancelAnimationFrame(moveFrameRef.current);
      }
    },
    [],
  );

  const applyDisplay = (next: PixelRect, commitReact = false) => {
    displayRef.current = next;
    syncOuterStyle(next);
    if (commitReact || !activeRef.current) {
      setDisplay(next);
    }
    if (activeRef.current) {
      dispatchPixelShapeLiveResize();
    }
  };

  const scheduleMarkGuides = (
    next: PixelRect,
    event: PointerEvent,
    active: ActiveInteraction,
  ) => {
    if (!onMarkGuidesChange || !markLinesEnabled) return;
    if (markGuideFrameRef.current !== null) return;
    markGuideFrameRef.current = requestAnimationFrame(() => {
      markGuideFrameRef.current = null;
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
    });
  };

  const rectForPointer = (
    event: PointerEvent,
    active: ActiveInteraction,
  ): PixelRect => {
    const screenDelta = {
      x: event.clientX - active.startClient.x,
      y: event.clientY - active.startClient.y,
    };
    const delta = screenDeltaToCanvas(screenDelta, scale);
    const raw = applyPixelInteraction(active.startRect, delta, active.kind, canvas, {
      allowBottomGrowth: true,
    });
    const nextHint = boundaryHint(
      active.startRect,
      { x: delta.x, y: delta.y, width: raw.width - active.startRect.width, height: raw.height - active.startRect.height },
      raw,
      active.kind,
    );
    setHint((previous) => (previous === nextHint ? previous : nextHint));
    if (!onMarkGuidesChange || !markLinesEnabled) return raw;
    const markTargets = snapTargets ?? otherWidgets ?? [];
    return computeMarkLineSnap(raw, markTargets, {
      threshold: markLineThreshold(scale),
      dragDir: {
        isRightward: event.clientX >= active.startClient.x,
        isDownward: event.clientY >= active.startClient.y,
      },
      canvas,
    }).rect;
  };

  const flushPointerFrame = () => {
    moveFrameRef.current = null;
    const pending = pendingMoveRef.current;
    if (!pending) return;
    pendingMoveRef.current = null;
    const { rect: next, event, active } = pending;
    applyDisplay(next);
    scheduleMarkGuides(next, event, active);
    onPreview?.(withRect(widget, next));
  };

  const handlePointerMove = (event: PointerEvent) => {
    const active = activeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.skipFirstMove) {
      active.skipFirstMove = false;
      if (isResizeInteraction(active.kind)) return;
    }
    const next = rectForPointer(event, active);
    pendingMoveRef.current = { rect: next, event, active };
    if (moveFrameRef.current !== null) return;
    moveFrameRef.current = requestAnimationFrame(flushPointerFrame);
  };

  const finish = (event: PointerEvent, commit: boolean) => {
    const active = activeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (moveFrameRef.current !== null) {
      cancelAnimationFrame(moveFrameRef.current);
      moveFrameRef.current = null;
    }
    pendingMoveRef.current = null;
    const finalRect = commit
      ? rectForPointer(event, active)
      : widgetRect(widget);
    activeRef.current = null;
    setIsPlayer(false);
    setHint(null);
    onMarkGuidesChange?.(null);
    applyDisplay(finalRect, true);
    if (commit) onCommit?.(withRect(widget, finalRect));
    else onCancel?.(widget.id);
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
    const pointerId = event.pointerId;
    activeRef.current = {
      pointerId,
      kind,
      startClient: { x: event.clientX, y: event.clientY },
      startRect: displayRef.current,
      skipFirstMove: true,
    };
    setIsPlayer(true);
    bindDocumentDrag(pointerId, {
      onMove: handlePointerMove,
      onEnd: (endEvent, commit) => finish(endEvent, commit),
    });
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
    applyDisplay(next, true);
    onCommit?.(withRect(widget, next));
  };

  const liveRect = isPlayer ? displayRef.current : display;

  return (
    <div
      ref={outerRef}
      id={`shape-id-${widget.id}`}
      data-testid={`pixel-shape-${widget.id}`}
      data-component-id={widget.id}
      data-pixel-is-player={isPlayer ? "" : undefined}
      className={cn(
        "shape pixel-shape-outer absolute flex touch-none select-none flex-col border p-[5px]",
        mode === "edit" && selected
          ? "pixel-shape-selected z-[1]"
          : "border-gray-200/90 dark:border-gray-700/80",
        shell.outer.className,
      )}
      style={{
        left: liveRect.x,
        top: liveRect.y,
        width: liveRect.width,
        height: liveRect.height,
        zIndex: pixelShapeZIndex(widget.order, mode === "edit" && selected),
        ...shell.outer.style,
      }}
    >
      {hint ? (
        <p className="sr-only" role="status" data-testid="pixel-boundary-hint">
          {hint}
        </p>
      ) : null}
      <WidgetShapeChrome
        title={widget.title}
        titleStyle={titleStyle}
        showTitle={showTitle}
        remark={remark}
        mode={mode}
        selected={Boolean(mode === "edit" && selected)}
        widgetId={widget.id}
        onTitleChange={onTitleChange}
        onSelectPointerDown={(event) => onSelect?.(widget.id, event.shiftKey)}
        onDragPointerDown={(event) => startInteraction(event, "move")}
        onDragKeyDown={(event) => handleKeyboardInteraction(event, "move")}
      />
      {mode === "edit" && selected && widgetActions && viewport && chrome.showFloatingActions ? (
        <PixelShapeActionRail
          widget={widget}
          scale={scale}
          viewport={viewport}
          otherWidgets={otherWidgets}
          actions={widgetActions}
        />
      ) : null}
      <PixelShapeInteractionProvider value={startInteraction}>
        <PixelShapePlayerProvider playing={isPlayer}>
          <div
            className="pixel-shape-inner dashboard-widget-surface relative min-h-0 flex-1 overflow-hidden"
            style={{
              ...shell.inner,
              background:
                shell.inner.background ??
                shell.outer.style.background ??
                (styleConfig?.colorScheme === "dark" ? "#1e293b" : undefined),
            }}
            data-pixel-no-drag
            onPointerDown={(event) => {
              if (mode === "edit") onSelect?.(widget.id, event.shiftKey);
            }}
          >
            {children}
          </div>
        </PixelShapePlayerProvider>
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
