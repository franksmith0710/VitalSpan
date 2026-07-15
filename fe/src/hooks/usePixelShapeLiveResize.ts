import { useEffect, useRef } from "react";
import { PIXEL_SHAPE_LIVE_RESIZE } from "@/components/dashboard/pixelCanvas/pixelShapeLiveResize";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";

/** 看板 isPlayer 拖缩放时由 PixelShape 广播，仅活动 shape 内图表跟手 resize */
export function usePixelShapeLiveResize(enabled: boolean, onResize: () => void) {
  const playing = usePixelShapePlayer();
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    if (!enabled || !playing) return;
    const handler = () => onResizeRef.current();
    document.addEventListener(PIXEL_SHAPE_LIVE_RESIZE, handler);
    return () => document.removeEventListener(PIXEL_SHAPE_LIVE_RESIZE, handler);
  }, [enabled, playing]);
}
