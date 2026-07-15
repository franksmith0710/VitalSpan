import { useCallback, useEffect, useRef, type RefObject } from "react";
import { usePixelShapeLiveResize } from "@/hooks/usePixelShapeLiveResize";

/**
 * 看板内嵌图表跟手缩放：rAF 合帧 + isPlayer 广播 + 监听 shape 外框。
 * 看板内嵌图表跟手缩放：rAF 合帧 + isPlayer 广播 + 监听 shape 外框。
 */
export function useEmbeddedChartLiveResize(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onResize: () => void,
) {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const resizeFrameRef = useRef<number | null>(null);

  const scheduleResize = useCallback(() => {
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      onResizeRef.current();
    });
  }, []);

  usePixelShapeLiveResize(enabled, scheduleResize);

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
