import { useCallback, useEffect, useState } from "react";

type Size = { width: number; height: number };

/** 监听容器尺寸，供图表/表格随 widget 缩放自适应 */
export function useElementSize<T extends HTMLElement>(enabled = true): {
  ref: (node: T | null) => void;
  size: Size;
} {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const ref = useCallback((next: T | null) => setNode(next), []);

  useEffect(() => {
    if (!enabled || !node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(node);
    return () => ro.disconnect();
  }, [enabled, node]);

  return { ref, size };
}
