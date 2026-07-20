import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { cn } from "@/lib/utils";
import { CanvasRuler } from "./CanvasRuler";
import { canvasRulerChromeVars, canvasRulerSurfaceStyle } from "./canvasRulerChrome";
import { CANVAS_RULER_SIZE_PX, DATA_SCREEN_VIEWPORT_BG } from "./canvasRulerUtils";
import {
  applyViewportPanTranslate,
  type ViewportPanSession,
} from "./dataScreenViewportPan";
import { isPixelCanvasWidgetTarget } from "../pixelCanvas/pixelCanvasHitTest";
import {
  computePresentationTransform,
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
  presentationMode = "fitHeight",
  className,
  onBlankPointerDown,
  children,
}: DataScreenEditViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const spacePanRef = useRef(false);
  const panSessionRef = useRef<ViewportPanSession | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const viewPanRef = useRef(viewPan);
  viewPanRef.current = viewPan;
  const [userZoom, setUserZoom] = useState(1);
  const [spacePan, setSpacePan] = useState(false);

  useEffect(() => {
    setViewPan({ x: 0, y: 0 });
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
  const offsetX =
    presentationMode === "fitHeight" || scaledWidth > viewportSize.width
      ? 0
      : baseTransform.translateX;
  const offsetY =
    presentationMode === "fitHeight" || scaledHeight > viewportSize.height
      ? 0
      : baseTransform.translateY;

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
        return clampViewportPan(resolved, boundsRef.current);
      });
    },
    [],
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
  ]);

  const endPanSession = useCallback(() => {
    panSessionRef.current = null;
  }, []);

  useEffect(() => {
    const releaseSpacePan = () => {
      spacePanRef.current = false;
      setSpacePan(false);
      panSessionRef.current = null;
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
      const next = applyViewportPanTranslate(session, event.clientX, event.clientY);
      applyPan({ x: next.panX, y: next.panY });
    };

    const onPointerEnd = (event: PointerEvent) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      endPanSession();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!spacePanRef.current || event.button !== 0) return;
      const viewportEl = viewportRef.current;
      if (!viewportEl || !viewportEl.contains(event.target as Node)) return;
      event.preventDefault();
      event.stopPropagation();
      panSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: viewPanRef.current.x,
        panY: viewPanRef.current.y,
      };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseSpacePan);
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("pointermove", onPointerMove, { capture: true });
    document.addEventListener("pointerup", onPointerEnd, { capture: true });
    document.addEventListener("pointercancel", onPointerEnd, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseSpacePan);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.removeEventListener("pointerup", onPointerEnd, { capture: true });
      document.removeEventListener("pointercancel", onPointerEnd, { capture: true });
    };
  }, [applyPan, endPanSession]);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        setUserZoom((previous) => clampZoom(previous + direction * DATA_SCREEN_ZOOM_WHEEL_STEP));
        return;
      }
      if (event.deltaX === 0 && event.deltaY === 0) return;
      event.preventDefault();
      applyPan((previous) => ({
        x: previous.x - event.deltaX,
        y: previous.y - event.deltaY,
      }));
    },
    [applyPan],
  );

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
    setViewPan({ x: 0, y: 0 });
  }, []);

  const handleViewportPointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || spacePanRef.current) return;
      if (isEditableTarget(event.target)) return;
      if (isPixelCanvasWidgetTarget(event.target)) return;
      if (
        event.target instanceof Element &&
        (event.target.closest("[data-canvas-scale-area]") ||
          event.target.closest("[data-testid^='canvas-scrollbar-']"))
      ) {
        return;
      }
      onBlankPointerDown?.();
    },
    [onBlankPointerDown],
  );

  const stageStyle: CSSProperties = {
    width: canvasWidth,
    height: canvasHeight,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  };

  const rulerOffsetX = -viewPan.x;
  const rulerOffsetY = -viewPan.y;

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
        <div style={canvasRulerSurfaceStyle} aria-hidden />
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
          )}
          style={{ backgroundColor: DATA_SCREEN_VIEWPORT_BG }}
          data-canvas-scale-viewport
          onWheel={handleWheel}
          onPointerDownCapture={handleViewportPointerDownCapture}
        >
          <div
            className="absolute top-0 left-0"
            style={{
              transform: `translate(${viewPan.x}px, ${viewPan.y}px)`,
              width: scaledWidth,
              height: scaledHeight,
              left: offsetX,
              top: offsetY,
            }}
          >
            <div
              className={cn("absolute top-0 left-0", spacePan && "pointer-events-none")}
              style={stageStyle}
            >
              <DataScreenVisualScaleProvider scale={scale}>
                {children}
              </DataScreenVisualScaleProvider>
            </div>
          </div>
          <CanvasScaleArea
            userZoom={userZoom}
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
