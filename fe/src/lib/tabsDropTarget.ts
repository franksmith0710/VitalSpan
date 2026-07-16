/** 从拖放事件解析落点下的 Tab 容器 id（优先于画布坐标命中） */
export function readTabsWidgetIdFromDropEvent(event: Pick<DragEvent, "clientX" | "clientY">): string | null {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const host = target?.closest("[data-tabs-widget-id]");
  return host?.getAttribute("data-tabs-widget-id") ?? null;
}
