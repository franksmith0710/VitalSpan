import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { formatCompositeCategoryDisplay } from "@/components/charts/engine/buildDatasetEncoding";
import { VCDS, resolveAxisFontSize } from "@/components/charts/engine/d3/core/chartVisualTokens";

/** 11px 轴标签下平均每字符占位（中文/数字混合估算） */
const CHAR_PX = 6.5;
const CATEGORY_LABEL_GAP_PX = 12;
const CATEGORY_THINNING_MIN_PX = 48;

export type CategoryAxisLayout = {
  ticks: string[];
  rotateDeg: number;
  slotSpan: number;
  extraBottom: number;
};

export function estimateAxisLabelWidth(charCount: number): number {
  return charCount * CHAR_PX;
}

/** 均匀索引抽稀（对标 DataEase：首尾必留、中间等距） */
export function pickCategoryTickIndices(count: number, innerSpan: number, minPx = 48): number[] {
  if (count <= 0 || innerSpan <= 0) return [];
  const maxTicks = Math.max(2, Math.floor(innerSpan / minPx));
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i);

  const indices: number[] = [];
  for (let i = 0; i < maxTicks; i += 1) {
    indices.push(Math.round((i * (count - 1)) / (maxTicks - 1)));
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

function indexToSpanPx(index: number, count: number, innerSpan: number): number {
  if (count <= 1) return innerSpan;
  return (index / (count - 1)) * innerSpan;
}

/** band 柱图类目中心像素（无 scale 时估算，padding≈0.1） */
export function estimateCategoryBandCenterPx(
  index: number,
  count: number,
  innerSpan: number,
  bandWidth?: number,
): number {
  if (count <= 0) return 0;
  if (count === 1) return innerSpan / 2;
  if (bandWidth != null && bandWidth > 0) {
    const step = (innerSpan - bandWidth) / (count - 1);
    return index * step + bandWidth / 2;
  }
  const step = innerSpan / count;
  return index * step + step * 0.4;
}

/** 像素空间均匀取点再吸附索引（band 轴防索引舍入右端扎堆） */
export function pickCategoryTickIndicesByPixel(
  count: number,
  innerSpan: number,
  minPx: number,
  indexToPx: (index: number) => number,
): number[] {
  if (count <= 0 || innerSpan <= 0) return [];
  const maxTicks = Math.max(2, Math.floor(innerSpan / minPx));
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i);

  const indices: number[] = [];
  const firstPx = indexToPx(0);
  const lastPx = indexToPx(count - 1);
  const spanPx = lastPx - firstPx;

  for (let k = 0; k < maxTicks; k += 1) {
    const targetPx =
      maxTicks <= 1
        ? (firstPx + lastPx) / 2
        : firstPx + (k / (maxTicks - 1)) * spanPx;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < count; i += 1) {
      if (indices.includes(i)) continue;
      const dist = Math.abs(indexToPx(i) - targetPx);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    indices.push(bestIdx);
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

function horizontalLabelWidthPx(label: string, rotateDeg: number): number {
  const charPx = rotateDeg ? CHAR_PX * 0.75 : CHAR_PX;
  return label.length * charPx;
}

function labelWidthAtIndex(
  categories: string[],
  idx: number,
  labelFor: (category: string) => string,
  rotateDeg: number,
): number {
  const label = labelFor(categories[idx]!).trim();
  if (!label) return 0;
  return horizontalLabelWidthPx(label, rotateDeg);
}

function filterCategoryTickIndicesByOverlap(
  categories: string[],
  indices: number[],
  labelFor: (category: string) => string,
  rotateDeg: number,
  minGapPx: number,
  toPx: (index: number) => number,
): number[] {
  const kept: number[] = [];
  for (const idx of indices) {
    const labelW = labelWidthAtIndex(categories, idx, labelFor, rotateDeg);
    if (labelW <= 0) continue;
    const pos = toPx(idx);
    const prev = kept[kept.length - 1];
    if (prev != null) {
      const prevPos = toPx(prev);
      const prevW = labelWidthAtIndex(categories, prev, labelFor, rotateDeg);
      if (pos - prevPos < (prevW + labelW) / 2 + minGapPx) continue;
    }
    kept.push(idx);
  }
  if (kept.length > 0) return kept;
  const fallback = indices.find((idx) => labelWidthAtIndex(categories, idx, labelFor, rotateDeg) > 0);
  return fallback != null ? [fallback] : indices.length > 0 ? [indices[0]!] : [];
}

/** 对标 DataEase：首尾必留，冲突时去掉中间刻度 */
function ensureCategoryAxisEndpointIndices(
  indices: number[],
  count: number,
  categories: string[],
  labelFor: (category: string) => string,
  rotateDeg: number,
  minGapPx: number,
  toPx: (index: number) => number,
): number[] {
  if (count <= 0) return indices;
  const widthAt = (idx: number) => labelWidthAtIndex(categories, idx, labelFor, rotateDeg);

  const pruneAgainst = (anchorIdx: number, kept: number[]): number[] => {
    const anchorPos = toPx(anchorIdx);
    const anchorW = widthAt(anchorIdx);
    return kept.filter((idx) => {
      if (idx === anchorIdx) return true;
      const minDist = (widthAt(idx) + anchorW) / 2 + minGapPx;
      return Math.abs(anchorPos - toPx(idx)) >= minDist;
    });
  };

  let kept = [...indices];
  if (widthAt(0) > 0) {
    kept = pruneAgainst(0, [...new Set([...kept, 0])].sort((a, b) => a - b));
  }
  const lastIdx = count - 1;
  if (lastIdx > 0 && widthAt(lastIdx) > 0) {
    kept = pruneAgainst(lastIdx, [...new Set([...kept, lastIdx])].sort((a, b) => a - b));
  }
  return kept.sort((a, b) => a - b);
}

/** band 轴像素均匀抽稀 + 旋转感知防重叠 + 首尾必留 */
export function pickCategoryTickIndicesForLabels(
  categories: string[],
  innerSpan: number,
  labelFor: (category: string) => string,
  minPx = CATEGORY_THINNING_MIN_PX,
  rotateDeg = 0,
  indexToPx?: (index: number) => number,
): number[] {
  const count = categories.length;
  if (count === 0 || innerSpan <= 0) return [];

  const toPx =
    indexToPx ?? ((idx: number) => estimateCategoryBandCenterPx(idx, count, innerSpan));

  const maxLabelW = Math.max(
    0,
    ...categories.map((_, i) => labelWidthAtIndex(categories, i, labelFor, rotateDeg)),
  );
  const effectiveMinPx = Math.max(minPx, maxLabelW + CATEGORY_LABEL_GAP_PX);

  const baseIndices = pickCategoryTickIndicesByPixel(count, innerSpan, effectiveMinPx, toPx);
  const filtered = filterCategoryTickIndicesByOverlap(
    categories,
    baseIndices,
    labelFor,
    rotateDeg,
    CATEGORY_LABEL_GAP_PX,
    toPx,
  );
  return ensureCategoryAxisEndpointIndices(
    filtered,
    count,
    categories,
    labelFor,
    rotateDeg,
    CATEGORY_LABEL_GAP_PX,
    toPx,
  );
}

/** 在均匀抽稀结果上按标签宽度过滤，保证相邻标签像素间距 */
export function filterTickIndicesByLabelSpacing(
  categories: string[],
  indices: number[],
  innerSpan: number,
  labelFor: (category: string) => string,
  minGapPx = 10,
  indexToPx?: (index: number) => number,
): number[] {
  if (indices.length === 0 || categories.length === 0) return indices;
  const toPx =
    indexToPx ??
    ((idx: number) => indexToSpanPx(idx, categories.length, innerSpan));
  const kept: number[] = [];

  for (const idx of indices) {
    const category = categories[idx];
    if (!category) continue;
    const label = labelFor(category).trim();
    if (!label) continue;

    const labelW = estimateAxisLabelWidth(label.length);
    const pos = toPx(idx);
    const prev = kept[kept.length - 1];
    if (prev != null) {
      const prevPos = toPx(prev);
      if (pos - prevPos < labelW + minGapPx) continue;
    }
    const slot =
      kept.length > 0 ? pos - toPx(kept[0]!) : innerSpan;
    if (!axisLabelFitsSlot(label, Math.max(slot, labelW + minGapPx), 0)) continue;
    kept.push(idx);
  }

  if (kept.length > 0) return kept;
  return indices.length > 0 ? [indices[0]!] : [];
}

/** 对标 DataEase：视口内抽稀轴刻度，不缩小绘图区 */
export function pickCategoryTicks(categories: string[], innerSpan: number, minPx = 48): string[] {
  if (innerSpan <= 0 || categories.length === 0) return categories;
  const indices = pickCategoryTickIndices(categories.length, innerSpan, minPx);
  return indices.map((index) => categories[index]!);
}

function maxCharsForSlot(slotSpan: number, rotateDeg = 0): number {
  const charPx = rotateDeg ? CHAR_PX * 0.75 : CHAR_PX;
  return Math.max(2, Math.floor(slotSpan / charPx));
}

/** 类目轴完整展示文案（不截断） */
export function axisCategoryDisplayText(label: string): string {
  return formatCompositeCategoryDisplay(label);
}

/** 槽位是否可容纳完整标签（对标 DataEase：放不下则隐藏，不用省略号） */
export function axisLabelFitsSlot(text: string, slotSpan: number, rotateDeg = 0): boolean {
  if (!text) return false;
  return text.length <= maxCharsForSlot(slotSpan, rotateDeg);
}

/** 按标签宽度过滤抽稀结果（均匀间距 + 像素防重叠） */
export function pickCategoryTicksForLabels(
  categories: string[],
  innerSpan: number,
  labelFor: (category: string) => string,
  minPx = CATEGORY_THINNING_MIN_PX,
  rotateDeg = 0,
  indexToPx?: (index: number) => number,
): string[] {
  const indices = pickCategoryTickIndicesForLabels(
    categories,
    innerSpan,
    labelFor,
    minPx,
    rotateDeg,
    indexToPx,
  );
  if (indices.length === 0) {
    return categories.length > 0 ? [categories[0]!] : [];
  }
  return indices.map((index) => categories[index]!);
}

export function resolveCategoryLabelRotate(
  tickLabels: string[],
  innerSpan: number,
  explicitRotate?: number,
): number {
  if (explicitRotate != null) return explicitRotate;
  if (tickLabels.length === 0 || innerSpan <= 0) return 0;

  const slot = innerSpan / tickLabels.length;
  const maxChars = Math.max(...tickLabels.map((t) => String(t).length));
  const estWidth = estimateAxisLabelWidth(maxChars);

  if (estWidth > slot * 1.4) return -45;
  if (estWidth > slot * 0.82) return VCDS.axis.rotateDeg;
  if (tickLabels.length >= 3 && slot < VCDS.axis.rotateThreshold) return VCDS.axis.rotateDeg;
  return 0;
}

export function resolveRotatedAxisExtraSpan(rotateDeg: number): number {
  if (!rotateDeg) return 0;
  return rotateDeg <= -40 ? 24 : 16;
}

/** 对标 DataEase：槽位足够时展示完整类目名，不足则隐藏（不截断为省略号） */
export function formatAxisCategoryLabel(label: string, slotSpan = 48, rotateDeg = 0): string {
  const display = axisCategoryDisplayText(label);
  if (!axisLabelFitsSlot(display, slotSpan, rotateDeg)) return "";
  return display;
}

/** 横向柱图 / 热力图行轴：宽度不足时隐藏 */
export function formatHorizontalBandAxisLabel(label: string, maxWidthPx = 120): string {
  const display = axisCategoryDisplayText(label);
  if (!axisLabelFitsSlot(display, maxWidthPx, 0)) return "";
  return display;
}

export function planCategoryAxisLayout(
  categories: string[],
  innerSpan: number,
  explicitRotate?: number,
  minPx = CATEGORY_THINNING_MIN_PX,
  bandWidth?: number,
): CategoryAxisLayout {
  const count = categories.length;
  const indexToPx = (idx: number) =>
    estimateCategoryBandCenterPx(idx, count, innerSpan, bandWidth);
  const allLabels = categories.map((category) => axisCategoryDisplayText(String(category)));
  const rotateDeg = resolveCategoryLabelRotate(allLabels, innerSpan, explicitRotate);
  const tickIndices = pickCategoryTickIndicesForLabels(
    categories,
    innerSpan,
    (category) => axisCategoryDisplayText(String(category)),
    minPx,
    rotateDeg,
    indexToPx,
  );
  const ticks = tickIndices.map((index) => categories[index]!);
  const slotSpan = innerSpan / Math.max(1, tickIndices.length);
  return {
    ticks,
    rotateDeg,
    slotSpan,
    extraBottom: resolveRotatedAxisExtraSpan(rotateDeg),
  };
}

/** 数据显示优先：数值轴尽量多刻度 */
export function resolveNumericTickCount(innerSpan: number, min = 4, max = 12): number {
  if (innerSpan <= 0) return min;
  return Math.max(min, Math.min(max, Math.floor(innerSpan / 48)));
}

const NUMERIC_TICK_LABEL_GAP_PX = 8;
const NUMERIC_TICK_MIN_LABEL_PX = 44;

function sampleNumericDomain(scale: d3.ScaleLinear<number, number>): number[] {
  const [a, b] = scale.domain();
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mid = (lo + hi) / 2;
  const samples = [lo, hi, mid];
  if (lo <= 0 && hi >= 0) samples.push(0);
  return [...new Set(samples)];
}

/** 按格式化后标签宽度抽稀数值轴刻度（对标类目轴 pickCategoryTicks） */
export function planNumericAxisTicks(
  scale: d3.ScaleLinear<number, number>,
  innerSpan: number,
  formatLabel: (value: d3.NumberValue) => string,
  options?: { minTicks?: number; maxTicks?: number; minLabelPx?: number },
): number[] {
  const minTicks = options?.minTicks ?? 2;
  const maxTicks = options?.maxTicks ?? 12;
  const minLabelPx = options?.minLabelPx ?? NUMERIC_TICK_MIN_LABEL_PX;
  if (innerSpan <= 0) return scale.ticks(minTicks);

  const maxLabelW = Math.max(
    minLabelPx,
    ...sampleNumericDomain(scale).map(
      (v) => estimateAxisLabelWidth(formatLabel(v).length) + NUMERIC_TICK_LABEL_GAP_PX,
    ),
  );
  const capacity = Math.max(minTicks, Math.min(maxTicks, Math.floor(innerSpan / maxLabelW)));
  const ticks = scale.ticks(capacity);
  if (ticks.length <= capacity) return ticks;

  const step = Math.ceil(ticks.length / capacity);
  const picked: number[] = [];
  for (let i = 0; i < ticks.length; i += step) picked.push(ticks[i]!);
  const last = ticks[ticks.length - 1]!;
  if (picked[picked.length - 1] !== last) picked.push(last);
  return picked;
}

/** 类目 band 过窄时缩小轴标签字号，但不隐藏 */
export function resolveBandAxisFontSize(bandHeight: number, base = resolveAxisFontSize()): number {
  if (bandHeight >= 13) return base;
  return Math.max(7, Math.min(base, Math.floor(bandHeight * 0.85)));
}

/** 柱上数值标签：随 band 高度缩小，但不跳过 */
export function resolveBarLabelFontSize(bandSpan: number, preferred = 11): number {
  if (bandSpan >= 12) return preferred;
  return Math.max(7, Math.min(preferred, Math.floor(bandSpan * 0.85)));
}

/** 横向柱图左侧类目轴：抽稀刻度 + 按最长标签估算左边距 */
export function resolveHorizontalCategoryAxisLayout(
  categories: string[],
  innerH: number,
  minPx = 28,
): { ticks: string[]; leftMargin: number; bandHeight: number; labelMaxWidth: number } {
  if (categories.length === 0 || innerH <= 0) {
    return { ticks: [], leftMargin: 52, bandHeight: 0, labelMaxWidth: 120 };
  }

  const bandHeight = innerH / categories.length;
  const ticks = pickCategoryTicks(categories, innerH, minPx);
  const maxLabelChars = categories.reduce(
    (max, cat) => Math.max(max, formatCompositeCategoryDisplay(String(cat)).length),
    0,
  );
  const labelMaxWidth = estimateAxisLabelWidth(maxLabelChars);
  const leftMargin = Math.max(52, labelMaxWidth + 18);

  return { ticks, leftMargin, bandHeight, labelMaxWidth };
}

export function styleAxis(
  sel: d3.Selection<SVGGElement, unknown, null, undefined>,
  theme: AntvThemeTokens,
  fontSize = resolveAxisFontSize(),
  sideStyle?: { lineColor?: string; lineWidth?: number },
) {
  sel
    .selectAll("text")
    .attr("fill", theme.axisLabel)
    .style("font-size", `${fontSize}px`)
    .style("font-family", "inherit");
  const stroke = sideStyle?.lineColor ?? theme.axisLine;
  const strokeWidth = sideStyle?.lineWidth ?? 1;
  sel.select(".domain").attr("stroke", stroke).attr("stroke-width", strokeWidth);
  sel.selectAll(".tick line").attr("stroke", stroke).attr("stroke-width", strokeWidth);
}

export function applyRotatedCategoryLabels(
  sel: d3.Selection<SVGGElement, unknown, null, undefined>,
  rotateDeg: number,
) {
  if (!rotateDeg) return;
  sel
    .selectAll("text")
    .attr("transform", `rotate(${rotateDeg})`)
    .style("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.15em");
}
