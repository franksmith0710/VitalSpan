import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { formatCompositeCategoryDisplay } from "@/components/charts/engine/buildDatasetEncoding";
import { VCDS, resolveAxisFontSize } from "@/components/charts/engine/d3/core/chartVisualTokens";

/** 11px 轴标签下平均每字符占位（中文/数字混合估算） */
const CHAR_PX = 6.5;

export type CategoryAxisLayout = {
  ticks: string[];
  rotateDeg: number;
  slotSpan: number;
  extraBottom: number;
};

export function estimateAxisLabelWidth(charCount: number): number {
  return charCount * CHAR_PX;
}

/** 对标 DataEase：视口内抽稀轴刻度，不缩小绘图区 */
export function pickCategoryTicks(categories: string[], innerSpan: number, minPx = 48): string[] {
  if (innerSpan <= 0 || categories.length === 0) return categories;
  const maxTicks = Math.max(2, Math.floor(innerSpan / minPx));
  if (categories.length <= maxTicks) return categories;
  const step = Math.ceil(categories.length / maxTicks);
  return categories.filter((_, index) => index % step === 0 || index === categories.length - 1);
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return text.slice(0, 1);
  return `${text.slice(0, maxChars - 1)}…`;
}

function maxCharsForSlot(slotSpan: number, rotateDeg = 0): number {
  const charPx = rotateDeg ? CHAR_PX * 0.75 : CHAR_PX;
  return Math.max(2, Math.floor(slotSpan / charPx));
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

/** 对标 DataEase：槽位不足时截断类目名（含多维度复合标签） */
export function formatAxisCategoryLabel(label: string, slotSpan = 48, rotateDeg = 0): string {
  const display = formatCompositeCategoryDisplay(label);
  return truncateLabel(display, maxCharsForSlot(slotSpan, rotateDeg));
}

/** 横向柱图 / 热力图行轴：按可用宽度截断 */
export function formatHorizontalBandAxisLabel(label: string, maxWidthPx = 120): string {
  const display = formatCompositeCategoryDisplay(label);
  return truncateLabel(display, maxCharsForSlot(maxWidthPx, 0));
}

export function planCategoryAxisLayout(
  categories: string[],
  innerSpan: number,
  explicitRotate?: number,
  minPx = 48,
): CategoryAxisLayout {
  const ticks = pickCategoryTicks(categories, innerSpan, minPx);
  const slotSpan = innerSpan / Math.max(1, ticks.length);
  const displayTicks = ticks.map((tick) => formatCompositeCategoryDisplay(String(tick)));
  const rotateDeg = resolveCategoryLabelRotate(displayTicks, innerSpan, explicitRotate);
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
