import { useEffect, useRef } from "react";
import { PIXEL_SHAPE_LIVE_RESIZE } from "@/components/dashboard/pixelCanvas/pixelShapeLiveResize";

/** 看板 isPlayer 拖缩放时由 PixelShape 广播，驱动 ECharts 等补 resize */
export function usePixelShapeLiveResize(enabled: boolean, onResize: () => void) {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    if (!enabled) return;
    const handler = () => onResizeRef.current();
    document.addEventListener(PIXEL_SHAPE_LIVE_RESIZE, handler);
    return () => document.removeEventListener(PIXEL_SHAPE_LIVE_RESIZE, handler);
  }, [enabled]);
}
