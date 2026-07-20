import { useCallback, useEffect, useRef, type RefObject } from "react";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import { PIXEL_LAYOUT_GEOMETRY_COMMITTED } from "@/components/dashboard/pixelCanvas/pixelShapeLiveResize";
import { usePixelShapeLiveResize } from "@/hooks/usePixelShapeLiveResize";

/**
 * 看板内嵌图表尺寸同步（对标 DataEase isPlayer §4.2）：
 * - 交互期：live event → rAF 合帧 → 引擎 changeSize（真实比例，禁止 canvas CSS 拉伸）
 * - 松手：geometry committed 同步 remeasure，再清 isPlayer
 * - isPlayer 期间跳过 ResizeObserver（防双路）
 */
export function useEmbeddedChartLiveResize(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onLiveResize: () => void,
  onCommitResize?: () => void,
) {
  const playing = usePixelShapePlayer();
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const onLiveRef = useRef(onLiveResize);
  onLiveRef.current = onLiveResize;
  const onCommitRef = useRef(onCommitResize ?? onLiveResize);
  onCommitRef.current = onCommitResize ?? onLiveResize;
  const resizeFrameRef = useRef<number | null>(null);
  const flushingRef = useRef(false);

  const runLiveResize = useCallback(() => {
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      onLiveRef.current();
    });
  }, []);

  const flushCommitResize = useCallback(() => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      onCommitRef.current();
    } finally {
      flushingRef.current = false;
    }
  }, []);

  usePixelShapeLiveResize(enabled, runLiveResize);

  const runResizeFromObserver = useCallback(() => {
    if (playingRef.current) return;
    runLiveResize();
  }, [runLiveResize]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener(PIXEL_LAYOUT_GEOMETRY_COMMITTED, flushCommitResize);
    return () => document.removeEventListener(PIXEL_LAYOUT_GEOMETRY_COMMITTED, flushCommitResize);
  }, [enabled, flushCommitResize]);

  useEffect(() => {
    if (!enabled) return;
    if (!playing) {
      flushCommitResize();
    }
  }, [enabled, playing, flushCommitResize]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const hosts = new Set<HTMLElement>([el]);
    const shapeOuter = el.closest(".shape, .pixel-shape-outer");
    const shapeInner = el.closest(".pixel-shape-inner");
    if (shapeOuter instanceof HTMLElement) hosts.add(shapeOuter);
    if (shapeInner instanceof HTMLElement) hosts.add(shapeInner);

    const observer = new ResizeObserver(() => {
      runResizeFromObserver();
    });
    for (const host of hosts) observer.observe(host);
    runResizeFromObserver();

    return () => {
      observer.disconnect();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [containerRef, enabled, runResizeFromObserver]);

  return flushCommitResize;
}
