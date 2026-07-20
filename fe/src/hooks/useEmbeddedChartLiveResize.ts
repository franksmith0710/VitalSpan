import { useCallback, useEffect, useRef, type RefObject } from "react";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import { PIXEL_LAYOUT_GEOMETRY_COMMITTED } from "@/components/dashboard/pixelCanvas/pixelShapeLiveResize";

/**
 * 看板内嵌图表尺寸同步：ResizeObserver + 松手 geometry committed。
 * isPlayer 期间跳过一切引擎 resize（内容由 CSS transform 跟手，松手后单次 remeasure）。
 */
export function useEmbeddedChartLiveResize(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onResize: () => void,
) {
  const playing = usePixelShapePlayer();
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const resizeFrameRef = useRef<number | null>(null);

  const scheduleResize = useCallback(() => {
    if (playingRef.current) return;
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      onResizeRef.current();
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handler = () => scheduleResize();
    document.addEventListener(PIXEL_LAYOUT_GEOMETRY_COMMITTED, handler);
    return () => document.removeEventListener(PIXEL_LAYOUT_GEOMETRY_COMMITTED, handler);
  }, [enabled, scheduleResize]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const hosts = new Set<HTMLElement>([el]);
    const shapeOuter = el.closest(".shape, .pixel-shape-outer");
    const shapeInner = el.closest(".pixel-shape-inner");
    if (shapeOuter instanceof HTMLElement) hosts.add(shapeOuter);
    if (shapeInner instanceof HTMLElement) hosts.add(shapeInner);

    const observer = new ResizeObserver(() => scheduleResize());
    for (const host of hosts) observer.observe(host);
    scheduleResize();

    return () => {
      observer.disconnect();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [containerRef, enabled, scheduleResize]);

  return scheduleResize;
}
