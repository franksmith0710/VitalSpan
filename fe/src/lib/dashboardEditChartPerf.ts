/** 编辑态未选中组件：绘制分辨率上限（逻辑 px），选中后全分辨率 */
export const EDIT_CHART_PAINT_MAX_EDGE = 720;

export function resolveEditPaintMaxEdge(
  editMode: boolean,
  selected: boolean,
): number | undefined {
  if (!editMode || selected) return undefined;
  return EDIT_CHART_PAINT_MAX_EDGE;
}

export function capChartPaintSize(
  size: { width: number; height: number },
  maxEdge?: number,
): { width: number; height: number } {
  if (!maxEdge || maxEdge <= 0) return size;
  const edge = Math.max(size.width, size.height);
  if (edge <= maxEdge) return size;
  const ratio = maxEdge / edge;
  return {
    width: Math.max(48, Math.round(size.width * ratio)),
    height: Math.max(48, Math.round(size.height * ratio)),
  };
}

/** 未选中组件跳过 live resize 重绘，松手/选中后再 commit */
export function shouldDeferEditLivePaint(editMode: boolean, selected: boolean): boolean {
  return editMode && !selected;
}
