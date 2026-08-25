import { useEffect, useState } from "react";
import { useChartVisualScale } from "@/hooks/useChartVisualScale";

/** 大屏缩放防抖：缩放过程中不触发图表 commit 重绘 */
export function useDebouncedChartVisualScale(delayMs = 280): number {
  const visualScale = useChartVisualScale();
  const [debounced, setDebounced] = useState(visualScale);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(visualScale), delayMs);
    return () => window.clearTimeout(timer);
  }, [visualScale, delayMs]);

  return debounced;
}
