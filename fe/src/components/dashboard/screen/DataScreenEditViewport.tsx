import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CanvasRuler } from "./CanvasRuler";
import { canvasRulerChromeVars, canvasRulerCornerClass, canvasRulerCornerStyle, CanvasRulerCornerMark } from "./canvasRulerChrome";
import { CANVAS_RULER_SIZE_PX, DATA_SCREEN_VIEWPORT_BG, resolveCanvasRulerScrollOffset } from "./canvasRulerUtils";
import {
  applyViewportPanTranslate,
  type ViewportPanSession,
} from "./dataScreenViewportPan";
import { isPixelCanvasWidgetTarget } from "../pixelCanvas/pixelCanvasHitTest";
import { shouldDelegateWheelFromCanvasHost } from "../pixelCanvas/pixelCanvasWheelScroll";
import {
  applyViewportPanLayerTransform,
  hasExceededPanClickThreshold,
} from "./viewportPanLayer";
import {
  computePresentationTransform,
  DATA_SCREEN_EDIT_PRESENTATION_DEFAULT,
  resolveDataScreenEditViewportOffsets,
  type PresentationMode,
} from "./presentationScale";

import { CanvasScaleArea } from "./CanvasScaleArea";
import { DataScreenVisualScaleProvider } from "./dataScreenVisualScaleContext";
import {
  CanvasViewportScrollbarHorizontal,
  CanvasViewportScrollbarVertical,
  canvasViewportScrollbarStyle,
} from "./CanvasViewportScrollbars";
import {
  clampViewportPan,
  computeViewportScrollMetrics,
  CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX,
} from "./dataScreenViewportScroll";
import {
  clampDataScreenUserZoom,
  DATA_SCREEN_ZOOM_WHEEL_STEP,
  stepDataScreenUserZoom,
} from "./dataScreenViewportZoom";

export type DataScreenEditViewportProps = {
  canvasWidth: number;
  canvasHeight: number;
  presentationMode?: PresentationMode;
  className?: string;
  /** 点击视口留白或画布非组件区域时（如取消选中、回到大屏配置） */
  onBlankPointerDown?: () => void;
  children: ReactNode;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function clampZoom(value: number): number {
  return clampDataScreenUserZoom(value);
}

export function DataScreenEditViewport({
  canvasWidth,
  canvasHeight,
  presentationMode = DATA_SCREEN_EDIT_PRESENTATION_DEFAULT,
  className,
  onBlankPointerDown,
  children,
}: DataScreenEditViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const wheelHostRef = useRef<HTMLDivElement>(null);
  const panLayerRef = useRef<HTMLDivElement>(null);
  const spacePanRef = useRef(false);
  const panSessionRef = useRef<ViewportPanSession | null>(null);
  const panMovedRef = useRef(false);
  const blankClickPendingRef = useRef(false);
  const panCommitFrameRef = useRef<number | null>(null);
  const onBlankPointerDownRef = useRef(onBlankPointerDown);
  onBlankPointerDownRef.current = onBlankPointerDown;
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const viewPanRef = useRef(viewPan);
  viewPanRef.current = viewPan;
  const [userZoom, setUserZoom] = useState(1);
  const [spacePan, setSpacePan] = useState(false);
  const [panDragging, setPanDragging] = useState(false);

  useEffect(() => {
    setViewPan({ x: 0, y: 0 });
    setUserZoom(1);
  }, [canvasWidth, canvasHeight, presentationMode]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewportSize({ width, height });
    });
    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, []);

  const baseTransform = computePresentationTransform(
    viewportSize.width,
    viewportSize.height,
    canvasWidth,
    canvasHeight,
    presentationMode,
  );
  const scale = baseTransform.scaleX * userZoom;
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;
  const { offsetX, offsetY } = resolveDataScreenEditViewportOffsets();
  const offsetXRef = useRef(offsetX);
  const offsetYRef = useRef(offsetY);
  offsetXRef.current = offsetX;
  offsetYRef.current = offsetY;

  const syncPanLayer = useCallback((pan: { x: number; y: number }) => {
    applyViewportPanLayerTransform(
      panLayerRef.current,
      offsetXRef.current,
      offsetYRef.current,
      pan,
    );
  }, []);

  const commitPanState = useCallback((pan: { x: number; y: number }) => {
    viewPanRef.current = pan;
    setViewPan(pan);
  }, []);

  const schedulePanStateCommit = useCallback(() => {
    if (panCommitFrameRef.current != null) return;
    panCommitFrameRef.current = window.requestAnimationFrame(() => {
      panCommitFrameRef.current = null;
      setViewPan({ ...viewPanRef.current });
    });
  }, []);

  useEffect(() => {
    syncPanLayer(viewPan);
  }, [viewPan.x, viewPan.y, offsetX, offsetY, syncPanLayer]);

  const contentLayout = useMemo(
    () => ({
      scaledWidth,
      scaledHeight,
      offsetX,
      offsetY,
    }),
    [scaledWidth, scaledHeight, offsetX, offsetY],
  );

  const scrollMetrics = useMemo(
    () => computeViewportScrollMetrics(viewportSize, contentLayout, viewPan),
    [viewportSize, contentLayout, viewPan],
  );
  const boundsRef = useRef(scrollMetrics.bounds);
  boundsRef.current = scrollMetrics.bounds;

  const applyPan = useCallback(
    (next: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
      setViewPan((previous) => {
        const resolved = typeof next === "function" ? next(previous) : next;
        const clamped = clampViewportPan(resolved, boundsRef.current);
        viewPanRef.current = clamped;
        syncPanLayer(clamped);
        return clamped;
      });
    },
    [syncPanLayer],
  );

  const applyPanPatch = useCallback(
    (patch: { x?: number; y?: number }) => {
      applyPan((previous) => ({
        x: patch.x ?? previous.x,
        y: patch.y ?? previous.y,
      }));
    },
    [applyPan],
  );

  useEffect(() => {
    setViewPan((previous) => clampViewportPan(previous, scrollMetrics.bounds));
  }, [
    scrollMetrics.bounds.minPanX,
    scrollMetrics.bounds.maxPanX,
    scrollMetrics.bounds.minPanY,
    scrollMetrics.bounds.maxPanY,
    viewportSize.width,
    viewportSize.height,
    scale,
  ]);

  const endPanSession = useCallback(() => {
    const session = panSessionRef.current;
    panSessionRef.current = null;
    setPanDragging(false);
    if (session) {
      commitPanState(viewPanRef.current);
    }
    if (blankClickPendingRef.current && !panMovedRef.current) {
      onBlankPointerDownRef.current?.();
    }
    blankClickPendingRef.current = false;
    panMovedRef.current = false;
  }, [commitPanState]);

  const isPanEligibleTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node)) return false;
    const viewportEl = viewportRef.current;
    if (!viewportEl?.contains(target)) return false;
    if (isEditableTarget(target)) return false;
    if (isPixelCanvasWidgetTarget(target)) return false;
    if (
      target instanceof Element &&
      (target.closest("[data-canvas-scale-area]") ||
        target.closest("[data-testid^='canvas-scrollbar-']"))
    ) {
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    const releaseSpacePan = () => {
      spacePanRef.current = false;
      setSpacePan(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      spacePanRef.current = true;
      setSpacePan(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      releaseSpacePan();
    };

    const onPointerMove = (event: PointerEvent) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      event.preventDefault();
      if (
        !panMovedRef.current &&
        hasExceededPanClickThreshold(session.startX, session.startY, event.clientX, event.clientY)
      ) {
        panMovedRef.current = true;
      }
      const next = applyViewportPanTranslate(session, event.clientX, event.clientY);
      const clamped = clampViewportPan({ x: next.panX, y: next.panY }, boundsRef.current);
      viewPanRef.current = clamped;
      syncPanLayer(clamped);
      schedulePanStateCommit();
    };

    const releasePointerCapture = (event: PointerEvent) => {
      const viewportEl = viewportRef.current;
      if (viewportEl?.hasPointerCapture(event.pointerId)) {
        viewportEl.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      releasePointerCapture(event);
      endPanSession();
    };

    const onPointerDown = (event: PointerEvent) => {
      const middleMouse = event.button === 1;
      const spaceLeft = event.button === 0 && spacePanRef.current;
      const blankLeft =
        event.button === 0 && !spacePanRef.current && isPanEligibleTarget(event.target);
      if (!middleMouse && !spaceLeft && !blankLeft) return;

      const viewportEl = viewportRef.current;
      if (!viewportEl) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        viewportEl.setPointerCapture(event.pointerId);
      } catch {
        // jsdom / legacy browsers
      }
      panMovedRef.current = false;
      blankClickPendingRef.current = blankLeft;
      panSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: viewPanRef.current.x,
        panY: viewPanRef.current.y,
      };
      setPanDragging(true);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseSpacePan);
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("pointermove", onPointerMove, { capture: true });
    document.addEventListener("pointerup", onPointerEnd, { capture: true });
    document.addEventListener("pointercancel", onPointerEnd, { capture: true });
    document.addEventListener("lostpointercapture", onPointerEnd, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseSpacePan);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.removeEventListener("pointerup", onPointerEnd, { capture: true });
      document.removeEventListener("pointercancel", onPointerEnd, { capture: true });
      document.removeEventListener("lostpointercapture", onPointerEnd, { capture: true });
    };
  }, [endPanSession, isPanEligibleTarget, schedulePanStateCommit, syncPanLayer]);

  useEffect(() => {
    const wheelHost = wheelHostRef.current;
    if (!wheelHost) return undefined;

    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !wheelHost.contains(target)) return;

      const onCanvasViewport = viewportRef.current?.contains(target) ?? false;
      const isZoomGesture = event.ctrlKey || event.metaKey;

      if (isZoomGesture) {
        if (event.cancelable) event.preventDefault();
        if (!onCanvasViewport) return;
        const direction = event.deltaY > 0 ? -1 : 1;
        setUserZoom((previous) => clampZoom(previous + direction * DATA_SCREEN_ZOOM_WHEEL_STEP));
        return;
      }

      if (!onCanvasViewport) return;
      if (!isZoomGesture && shouldDelegateWheelFromCanvasHost(wheelHost, event, target)) {
        return;
      }

      if (event.deltaX === 0 && event.deltaY === 0) return;
      if (event.cancelable) event.preventDefault();
      const clamped = clampViewportPan(
        {
          x: viewPanRef.current.x - event.deltaX,
          y: viewPanRef.current.y - event.deltaY,
        },
        boundsRef.current,
      );
      viewPanRef.current = clamped;
      syncPanLayer(clamped);
      schedulePanStateCommit();
    };

    wheelHost.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      wheelHost.removeEventListener("wheel", onWheel, { capture: true });
      if (panCommitFrameRef.current != null) {
        window.cancelAnimationFrame(panCommitFrameRef.current);
        panCommitFrameRef.current = null;
      }
    };
  }, [schedulePanStateCommit, syncPanLayer]);

  const handleZoomChange = useCallback((zoom: number) => {
    setUserZoom(clampZoom(zoom));
  }, []);

  const handleZoomIn = useCallback(() => {
    setUserZoom((previous) => stepDataScreenUserZoom(previous, 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setUserZoom((previous) => stepDataScreenUserZoom(previous, -1));
  }, []);

  const handleResetViewport = useCallback(() => {
    setUserZoom(1);
    const resetPan = { x: 0, y: 0 };
    viewPanRef.current = resetPan;
    syncPanLayer(resetPan);
    setViewPan(resetPan);
  }, [syncPanLayer]);

  const stageStyle: CSSProperties = {
    width: canvasWidth,
    height: canvasHeight,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  };

  const rulerOffsetX = resolveCanvasRulerScrollOffset(viewPan.x, offsetX);
  const rulerOffsetY = resolveCanvasRulerScrollOffset(viewPan.y, offsetY);

  return (
    <div
      className={cn("flex h-full min-h-0 w-full flex-col", className)}
      data-testid="data-screen-edit-viewport"
      data-presentation-mode={presentationMode}
      data-user-zoom={userZoom.toFixed(3)}
      data-space-pan={spacePan ? "true" : undefined}
      data-view-pan-x={viewPan.x}
      data-view-pan-y={viewPan.y}
    >
      <div
        ref={wheelHostRef}
        className="grid min-h-0 flex-1"
        style={
          {
            ...canvasViewportScrollbarStyle(),
            ...canvasRulerChromeVars(),
            gridTemplateColumns: `${CANVAS_RULER_SIZE_PX}px minmax(0, 1fr) ${CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX}px`,
            gridTemplateRows: `${CANVAS_RULER_SIZE_PX}px minmax(0, 1fr) ${CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX}px`,
          } as CSSProperties
        }
      >
        <div className={canvasRulerCornerClass} style={canvasRulerCornerStyle} aria-hidden>
          <CanvasRulerCornerMark />
        </div>
        <CanvasRuler
          orientation="horizontal"
          designLength={canvasWidth}
          scale={scale}
          scrollOffsetPx={rulerOffsetX}
          viewportPx={viewportSize.width}
        />
        <div
          className="bg-[#0d1117]"
          style={{ width: CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX, height: CANVAS_RULER_SIZE_PX }}
          aria-hidden
        />
        <CanvasRuler
          orientation="vertical"
          designLength={canvasHeight}
          scale={scale}
          scrollOffsetPx={rulerOffsetY}
          viewportPx={viewportSize.height}
        />
        <div
          ref={viewportRef}
          className={cn(
            "relative min-h-0 min-w-0 overflow-hidden",
            spacePan && "cursor-grab",
            panDragging && "cursor-grabbing",
          )}
          style={{ backgroundColor: DATA_SCREEN_VIEWPORT_BG }}
          data-canvas-scale-viewport
        >
          <div
            ref={panLayerRef}
            className="absolute top-0 left-0 will-change-transform"
          >
            <div
              className={cn("origin-top-left", (spacePan || panDragging) && "pointer-events-none")}
              data-testid="data-screen-canvas-stage"
              data-canvas-design-width={canvasWidth}
              data-canvas-design-height={canvasHeight}
              style={stageStyle}
            >
              <DataScreenVisualScaleProvider scale={scale}>
                {children}
              </DataScreenVisualScaleProvider>
            </div>
          </div>
          <CanvasScaleArea
            userZoom={userZoom}
            designCanvasWidth={canvasWidth}
            designCanvasHeight={canvasHeight}
            spacePanActive={spacePan}
            onZoomChange={handleZoomChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetViewport={handleResetViewport}
          />
        </div>
        <CanvasViewportScrollbarVertical
          metrics={scrollMetrics.vertical}
          bounds={scrollMetrics.bounds}
          onPanChange={applyPanPatch}
        />
        <div
          className="bg-[#0d1117]"
          style={{ width: CANVAS_RULER_SIZE_PX, height: CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX }}
          aria-hidden
        />
        <CanvasViewportScrollbarHorizontal
          metrics={scrollMetrics.horizontal}
          bounds={scrollMetrics.bounds}
          onPanChange={applyPanPatch}
        />
        <div
          className="bg-[#0d1117]"
          style={{
            width: CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX,
            height: CANVAS_VIEWPORT_SCROLLBAR_SIZE_PX,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
