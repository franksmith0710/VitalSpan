/** 嵌入图表容器测量（看板/大屏 widget 内） */
export function readEmbeddedContainerSize(
  el: HTMLElement | null | undefined,
): { width: number; height: number } | null {
  if (!el) return null;
  const width = el.clientWidth;
  const height = el.clientHeight;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

export function embeddedSizeChanged(
  next: { width: number; height: number },
  last: { width: number; height: number },
): boolean {
  return next.width !== last.width || next.height !== last.height;
}
