/** 与内置 chart `ADVANCED_CHART_ROW_CAP` 对齐，供 Payload 声明 */
export { ADVANCED_CHART_ROW_CAP as CUSTOM_VIZ_ROW_CAP } from "@/components/charts/engine/buildDatasetEncoding";

/** 按像素宽度抽稀类目标签下标（bundle 用于 X 轴 tick） */
export function thinCategoryTickIndices(
  categoryCount: number,
  innerWidth: number,
  minLabelPx = 56,
): number[] {
  if (categoryCount <= 0) return [];
  if (innerWidth <= 0) return [0];

  const maxTicks = Math.max(1, Math.floor(innerWidth / minLabelPx));
  if (categoryCount <= maxTicks) {
    return Array.from({ length: categoryCount }, (_, index) => index);
  }

  const step = Math.ceil(categoryCount / maxTicks);
  const indices: number[] = [];
  for (let i = 0; i < categoryCount; i += step) {
    indices.push(i);
  }
  const last = categoryCount - 1;
  if (indices[indices.length - 1] !== last) {
    indices.push(last);
  }
  return indices;
}

export function measureCustomVizHost(host: HTMLElement): { width: number; height: number } {
  const rect = host.getBoundingClientRect();
  return {
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}
