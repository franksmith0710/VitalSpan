/** 对标 DataEase debounceRender（文档参考）；isPlayer 引擎 resize 在松手后触发 */
export const PIXEL_LIVE_RESIZE_DEBOUNCE_MS = 32;

export const PIXEL_SHAPE_LIVE_RESIZE = "pixel-shape-live-resize";
export const PIXEL_LAYOUT_GEOMETRY_COMMITTED = "pixel-layout-geometry-committed";

export type PixelLayoutGeometryCommittedDetail = {
  /** 几何真正变化（宽/高）的组件；省略 = 全画布广播；空数组不派发 */
  widgetIds?: string[];
};

export function dispatchPixelShapeLiveResize() {
  document.dispatchEvent(new CustomEvent(PIXEL_SHAPE_LIVE_RESIZE));
}

/** 像素布局几何已提交；嵌入图表按 widgetIds 局部补测，避免未动组件全量重绘 */
export function dispatchPixelLayoutGeometryCommitted(widgetIds?: readonly string[]) {
  // 显式空数组 = 无人需要补测（勿当成「全画布广播」）
  if (widgetIds && widgetIds.length === 0) return;
  const detail: PixelLayoutGeometryCommittedDetail = {};
  if (widgetIds && widgetIds.length > 0) {
    detail.widgetIds = [...widgetIds];
  }
  document.dispatchEvent(
    new CustomEvent<PixelLayoutGeometryCommittedDetail>(PIXEL_LAYOUT_GEOMETRY_COMMITTED, {
      detail,
    }),
  );
}

export function resolvePixelWidgetIdFromElement(el: Element | null | undefined): string | null {
  if (!el) return null;
  const host = el.closest("[data-component-id]");
  return host?.getAttribute("data-component-id") ?? null;
}

/** 事件是否应触发该组件的 commit resize */
export function geometryCommitAffectsWidget(
  event: Event,
  widgetId: string | null | undefined,
): boolean {
  const detail = (event as CustomEvent<PixelLayoutGeometryCommittedDetail>).detail;
  const ids = detail?.widgetIds;
  // 显式空列表：无人补测
  if (Array.isArray(ids) && ids.length === 0) return false;
  // 省略 widgetIds：兼容全画布广播
  if (!ids) return true;
  if (!widgetId) return true;
  return ids.includes(widgetId);
}

type GeometryWidget = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 比较提交前后外框，仅宽/高变化的组件需要补测重绘（纯位移/碰撞推位不触发） */
export function collectGeometryChangedWidgetIds(
  before: readonly GeometryWidget[],
  after: readonly GeometryWidget[],
  alwaysInclude?: string,
): string[] {
  const prevById = new Map(before.map((item) => [item.id, item]));
  const changed: string[] = [];
  for (const next of after) {
    const prev = prevById.get(next.id);
    if (!prev || prev.width !== next.width || prev.height !== next.height) {
      changed.push(next.id);
    }
  }
  if (alwaysInclude) {
    const prev = prevById.get(alwaysInclude);
    const next = after.find((item) => item.id === alwaysInclude);
    const sizeChanged =
      !prev ||
      !next ||
      prev.width !== next.width ||
      prev.height !== next.height;
    if (sizeChanged && !changed.includes(alwaysInclude)) {
      changed.push(alwaysInclude);
    }
  }
  return changed;
}
