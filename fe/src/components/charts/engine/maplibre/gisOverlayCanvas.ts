/** 同步 overlay canvas 位图尺寸与容器 CSS 尺寸，避免 paint 用更大逻辑尺寸画在小画布上。 */
export function syncOverlayCanvasSize(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D | null,
  width: number,
  height: number,
  lastSize: { width: number; height: number },
): boolean {
  if (width === lastSize.width && height === lastSize.height) return false;
  lastSize.width = width;
  lastSize.height = height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
}

/** 与 MapLibre transform 对齐：用 layout client 尺寸，不用 getBoundingClientRect（祖先 scale 会漂移）。 */
export function readOverlayLayoutSize(el: HTMLElement): { width: number; height: number } {
  const width = el.clientWidth || el.offsetWidth || el.getBoundingClientRect().width;
  const height = el.clientHeight || el.offsetHeight || el.getBoundingClientRect().height;
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export const GIS_OVERLAY_CANVAS_CLASS =
  "pointer-events-none absolute inset-0 h-full w-full";
