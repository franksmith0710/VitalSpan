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

/** 像素画布 CSS scale 下用视觉尺寸反推绘制分辨率（对标 ECharts resize） */
export function readChartPaintSize(
  el: HTMLElement,
  options: {
    fill?: boolean;
    visualScale?: number;
    layoutFootprint?: { width: number; height: number };
    width?: number;
    height?: number;
    observedWidth?: number;
  } = {},
): { width: number; height: number } | null {
  const scale = options.visualScale && options.visualScale > 0 ? options.visualScale : 1;
  if (options.fill) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        width: Math.max(1, Math.round(rect.width / scale)),
        height: Math.max(1, Math.round(rect.height / scale)),
      };
    }
  }
  const rawWidth = options.fill
    ? el.clientWidth
    : (typeof options.width === "number" ? options.width : 0) ||
      options.observedWidth ||
      el.clientWidth;
  const rawHeight = options.fill ? el.clientHeight : (options.height ?? el.clientHeight);
  const height = rawHeight > 0 ? rawHeight : 180;
  const width = rawWidth > 0 ? rawWidth : Math.max(320, height);
  if (height <= 0) return null;
  return { width: Math.round(width), height: Math.round(height) };
}

export function embeddedSizeChanged(
  next: { width: number; height: number },
  last: { width: number; height: number },
): boolean {
  return next.width !== last.width || next.height !== last.height;
}
