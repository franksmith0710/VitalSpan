import type { PixelInteractionKind, PixelRect } from "./geometry";

export function isResizeInteraction(kind: PixelInteractionKind): boolean {
  return kind !== "move";
}

export function applyContentLiveScale(
  el: HTMLElement,
  base: PixelRect,
  target: PixelRect,
): void {
  const sx = target.width / Math.max(base.width, 1);
  const sy = target.height / Math.max(base.height, 1);
  el.style.width = `${base.width}px`;
  el.style.height = `${base.height}px`;
  el.style.transform = `scale(${sx}, ${sy})`;
  el.style.transformOrigin = "top left";
  el.style.willChange = "transform";
}

export function resetContentLiveScale(el: HTMLElement | null): void {
  if (!el) return;
  el.style.width = "";
  el.style.height = "";
  el.style.transform = "";
  el.style.transformOrigin = "";
  el.style.willChange = "";
}
