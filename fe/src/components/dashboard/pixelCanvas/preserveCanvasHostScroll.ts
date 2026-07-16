/** 在触发可能引起画布重排的回调前后，保持 pixel-canvas-host 的滚动位置 */
export function preservePixelCanvasHostScroll(run: () => void): void {
  const host = document.querySelector<HTMLElement>('[data-testid="pixel-canvas-host"]');
  const savedTop = host?.scrollTop ?? 0;
  const savedLeft = host?.scrollLeft ?? 0;
  run();
  if (!host || savedTop <= 0) return;
  const restore = () => {
    if (host.scrollTop < savedTop - 8) {
      host.scrollTop = savedTop;
      host.scrollLeft = savedLeft;
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(restore));
}
