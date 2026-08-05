import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import {
  CARTESIAN_CATEGORY_KEY_SEP,
  formatCategoryCellValue,
  inferCompositeCategoryLevels,
  sortCompositeCategoryKeys,
} from "@/components/charts/engine/buildDatasetEncoding";
import {
  axisCategoryDisplayText,
  axisLabelFitsSlot,
  estimateAxisLabelWidth,
  filterTickIndicesByLabelSpacing,
  pickCategoryTickIndices,
} from "@/components/charts/engine/d3/core/axes";
import { resolveAxisFontSize } from "@/components/charts/engine/d3/core/chartVisualTokens";
import type { ChartAxisStyle } from "@/lib/chartDeStyleBlocks";

const ROW_HEIGHT = 16;
/** 对标 DataEase：底行只展示部分刻度，保证间距 */
const THINNING_TICK_MIN_PX = 72;
type HierarchicalAxisPlanOptions = {
  /** 类别轴字段数下限（axes.xAxis），避免仅首维有值时层数被低估 */
  structuralLevelCount?: number;
};

export type HierarchicalAxisLayout = {
  levelCount: number;
  extraBottom: number;
  rowHeight: number;
};

export function resolveHierarchicalAxisLayout(activeLevelCount: number): HierarchicalAxisLayout {
  if (activeLevelCount <= 1) {
    return { levelCount: 1, extraBottom: 0, rowHeight: ROW_HEIGHT };
  }
  return {
    levelCount: activeLevelCount,
    extraBottom: activeLevelCount * ROW_HEIGHT + 6,
    rowHeight: ROW_HEIGHT,
  };
}

export { inferCompositeCategoryLevels };

export function splitCompositeCategoryParts(key: string, levelCount: number): string[] {
  const parts = String(key).split(CARTESIAN_CATEGORY_KEY_SEP);
  while (parts.length < levelCount) parts.push("");
  return parts.slice(0, levelCount).map(formatCategoryPartLabel);
}

function formatCategoryPartLabel(part: string): string {
  return formatCategoryCellValue(part);
}

function prefixKey(parts: string[], level: number): string {
  return parts.slice(0, level + 1).join(CARTESIAN_CATEGORY_KEY_SEP);
}

export type CategoryAxisSegment = {
  start: number;
  end: number;
  label: string;
};

export function buildCategoryLevelSegments(
  categories: string[],
  level: number,
  levelCount: number,
): CategoryAxisSegment[] {
  const segments: CategoryAxisSegment[] = [];
  let index = 0;
  while (index < categories.length) {
    const parts = splitCompositeCategoryParts(categories[index]!, levelCount);
    const label = parts[level] ?? "";
    const groupKey = prefixKey(parts, level);
    let end = index;
    while (end + 1 < categories.length) {
      const nextParts = splitCompositeCategoryParts(categories[end + 1]!, levelCount);
      if (prefixKey(nextParts, level) !== groupKey) break;
      end += 1;
    }
    segments.push({ start: index, end, label });
    index = end + 1;
  }
  return segments;
}

/** 跳过全空维行，只保留至少有一个可见标签的层级 */
export function resolveActiveCategoryLevels(
  categories: string[],
  structuralLevelCount: number,
): number[] {
  const active: number[] = [];
  for (let level = 0; level < structuralLevelCount; level += 1) {
    const segments = buildCategoryLevelSegments(categories, level, structuralLevelCount);
    if (segments.some((segment) => segment.label.length > 0)) active.push(level);
  }
  return active.length > 0 ? active : [0];
}

/** 叶级（最细维度）用于底行抽稀 */
export function resolveFinestLevelForThinning(activeLevels: number[]): number {
  return activeLevels[activeLevels.length - 1] ?? 0;
}

export type HierarchicalAxisPlan = {
  structuralLevelCount: number;
  activeLevels: number[];
  orderedCategories: string[];
  visibleCategories: string[];
  thinningLevel: number;
  extraBottom: number;
};

/** 粗粒度层边界索引（分组切换点，用于底行刻度对齐） */
export function pickCategoryBoundaryIndices(
  categories: string[],
  level: number,
  structuralLevelCount: number,
): number[] {
  if (categories.length === 0) return [];
  const indices = new Set<number>([0, categories.length - 1]);
  for (let i = 1; i < categories.length; i += 1) {
    const prev = categories[i - 1]!.split(CARTESIAN_CATEGORY_KEY_SEP);
    const curr = categories[i]!.split(CARTESIAN_CATEGORY_KEY_SEP);
    const prevPart = formatCategoryCellValue(prev[level] ?? "");
    const currPart = formatCategoryCellValue(curr[level] ?? "");
    if (prevPart !== currPart) indices.add(i);
  }
  return [...indices].sort((a, b) => a - b);
}

const LABEL_GAP_PX = 12;

function indexToSpanPx(index: number, count: number, innerSpan: number): number {
  if (count <= 1) return innerSpan / 2;
  return (index / (count - 1)) * innerSpan;
}

function pickThinningVisibleCategories(
  categories: string[],
  innerW: number,
  structuralLevelCount: number,
  thinningLevel: number,
  coarseLevel: number,
): string[] {
  const labelFor = (category: string) =>
    splitCompositeCategoryParts(category, structuralLevelCount)[thinningLevel] ?? "";

  const baseIndices = pickCategoryTickIndices(categories.length, innerW, THINNING_TICK_MIN_PX);
  const keptSet = new Set(
    filterTickIndicesByLabelSpacing(categories, baseIndices, innerW, labelFor, LABEL_GAP_PX),
  );

  const boundaries = pickCategoryBoundaryIndices(categories, coarseLevel, structuralLevelCount);
  for (const idx of boundaries) {
    if (keptSet.has(idx)) continue;
    const category = categories[idx]!;
    const label = labelFor(category).trim();
    if (!label) continue;
    const labelW = estimateAxisLabelWidth(label.length);
    const pos = indexToSpanPx(idx, categories.length, innerW);
    const tooClose = [...keptSet].some((ki) => {
      const gap = Math.abs(indexToSpanPx(ki, categories.length, innerW) - pos);
      return gap < labelW + LABEL_GAP_PX;
    });
    if (!tooClose && axisLabelFitsSlot(label, labelW + LABEL_GAP_PX, 0)) keptSet.add(idx);
  }

  if (keptSet.size === 0) return categories.length > 0 ? [categories[0]!] : [];
  return [...keptSet].sort((a, b) => a - b).map((index) => categories[index]!);
}

/** 对标 DataEase：分层轴底行抽稀、全层水平标签（不旋转进绘图区） */
export function planHierarchicalCategoryAxis(
  categories: string[],
  innerW: number,
  options?: HierarchicalAxisPlanOptions,
): HierarchicalAxisPlan | null {
  if (categories.length === 0 || innerW <= 0) return null;

  const structuralLevelCount = Math.max(
    inferCompositeCategoryLevels(categories),
    options?.structuralLevelCount ?? 1,
  );
  const orderedCategories = sortCompositeCategoryKeys(categories, structuralLevelCount);
  const activeLevels = resolveActiveCategoryLevels(orderedCategories, structuralLevelCount);
  if (activeLevels.length <= 1) return null;

  const thinningLevel = resolveFinestLevelForThinning(activeLevels);
  const coarseLevel = activeLevels[0]!;
  const visibleCategories = pickThinningVisibleCategories(
    orderedCategories,
    innerW,
    structuralLevelCount,
    thinningLevel,
    coarseLevel,
  );

  return {
    structuralLevelCount,
    activeLevels,
    orderedCategories,
    visibleCategories,
    thinningLevel,
    extraBottom: resolveHierarchicalAxisLayout(activeLevels.length).extraBottom,
  };
}

type CategoryScale = d3.ScalePoint<string> | d3.ScaleBand<string>;

function segmentSpanPx(
  xScale: CategoryScale,
  categories: string[],
  start: number,
  end: number,
  innerW: number,
): number {
  if (categories.length === 0) return innerW;
  const first = xScale(categories[start]!);
  const last = xScale(categories[end]!);
  if (first == null || last == null) return innerW / categories.length;
  if ("bandwidth" in xScale && typeof xScale.bandwidth === "function") {
    return Math.abs(last - first) + xScale.bandwidth();
  }
  const step = categories.length > 1 ? innerW / (categories.length - 1) : innerW;
  return Math.abs(last - first) + step * 0.85;
}

function segmentCenterPx(
  xScale: CategoryScale,
  categories: string[],
  start: number,
  end: number,
): number {
  const first = xScale(categories[start]!);
  const last = xScale(categories[end]!);
  if (first == null || last == null) return 0;
  if ("bandwidth" in xScale && typeof xScale.bandwidth === "function") {
    return first + (last - first + xScale.bandwidth()) / 2;
  }
  return (first + last) / 2;
}

function shouldDrawSegmentLabel(
  segment: CategoryAxisSegment,
  level: number,
  thinningLevel: number,
  coarseLevel: number,
  visibleSet: Set<string>,
  categories: string[],
  boundaryIndices: Set<number>,
): boolean {
  if (!segment.label) return false;

  if (level === thinningLevel) {
    const anchor = categories[segment.start]!;
    return visibleSet.has(anchor);
  }

  const display = axisCategoryDisplayText(segment.label);
  if (!display) return false;

  // 非叶级：合并段标题 + 粗粒度层边界单点（避免父级整行空白）
  if (segment.end > segment.start) return true;
  if (level === coarseLevel && boundaryIndices.has(segment.start)) return true;
  return false;
}

type DrawHierarchicalCategoryAxisOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: CategoryScale;
  categories: string[];
  innerH: number;
  innerW: number;
  theme: AntvThemeTokens;
  axisStyle?: ChartAxisStyle;
  plan?: HierarchicalAxisPlan;
};

/** 对标 DataEase：多维度分行 + 底行抽稀，标签仅在轴区水平展示 */
export function drawHierarchicalCategoryAxis(opts: DrawHierarchicalCategoryAxisOptions): void {
  if (opts.axisStyle?.x?.show === false) return;

  const plan = opts.plan ?? planHierarchicalCategoryAxis(opts.categories, opts.innerW);
  if (!plan) return;

  // 必须与 band/point scale domain 顺序一致（柱位序），禁止再 sort 打乱索引
  const categories = [...opts.xScale.domain()];
  const { structuralLevelCount, activeLevels, thinningLevel } = plan;
  const coarseLevel = activeLevels[0]!;
  const visibleCategories = pickThinningVisibleCategories(
    categories,
    opts.innerW,
    structuralLevelCount,
    thinningLevel,
    coarseLevel,
  );
  const visibleSet = new Set(visibleCategories);
  const coarseBoundaries = new Set(
    pickCategoryBoundaryIndices(categories, coarseLevel, structuralLevelCount),
  );
  const fontSize = resolveAxisFontSize();
  const stroke = opts.axisStyle?.x?.lineColor ?? opts.theme.axisLine;
  const strokeWidth = opts.axisStyle?.x?.lineWidth ?? 1;
  const axisRoot = opts.g.append("g").attr("class", "vs-axis-x vs-axis-x-tiered");

  axisRoot
    .append("line")
    .attr("class", "domain")
    .attr("x1", 0)
    .attr("x2", opts.innerW)
    .attr("y1", opts.innerH)
    .attr("y2", opts.innerH)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth);

  activeLevels.forEach((level, rowIdx) => {
    const rowY = opts.innerH + (rowIdx + 1) * ROW_HEIGHT - 4;
    const segments = buildCategoryLevelSegments(categories, level, structuralLevelCount);

    for (const segment of segments) {
      const slotSpan = segmentSpanPx(
        opts.xScale,
        categories,
        segment.start,
        segment.end,
        opts.innerW,
      );
      if (
        !shouldDrawSegmentLabel(
          segment,
          level,
          thinningLevel,
          coarseLevel,
          visibleSet,
          categories,
          coarseBoundaries,
        )
      ) {
        continue;
      }

      const display = axisCategoryDisplayText(segment.label);
      if (!display) continue;

      axisRoot
        .append("text")
        .attr("x", segmentCenterPx(opts.xScale, categories, segment.start, segment.end))
        .attr("y", rowY)
        .attr("text-anchor", "middle")
        .attr("fill", opts.theme.axisLabel)
        .style("font-size", `${fontSize}px`)
        .style("font-family", "inherit")
        .text(display);
    }

    const nextRowIdx = rowIdx + 1;
    if (nextRowIdx < activeLevels.length) {
      for (const segment of segments) {
        const slotSpan = segmentSpanPx(
          opts.xScale,
          categories,
          segment.start,
          segment.end,
          opts.innerW,
        );
        if (
          !shouldDrawSegmentLabel(segment, level, thinningLevel, visibleSet, categories, slotSpan)
        ) {
          continue;
        }
        const x = segmentCenterPx(opts.xScale, categories, segment.start, segment.end);
        const half = slotSpan / 2;
        const nextRowY = opts.innerH + (nextRowIdx + 1) * ROW_HEIGHT - 4;
        axisRoot
          .append("line")
          .attr("class", "tick")
          .attr("x1", x - half)
          .attr("x2", x - half)
          .attr("y1", rowY + 2)
          .attr("y2", nextRowY + 2)
          .attr("stroke", stroke)
          .attr("stroke-width", strokeWidth)
          .attr("opacity", 0.35);
        axisRoot
          .append("line")
          .attr("class", "tick")
          .attr("x1", x + half)
          .attr("x2", x + half)
          .attr("y1", rowY + 2)
          .attr("y2", nextRowY + 2)
          .attr("stroke", stroke)
          .attr("stroke-width", strokeWidth)
          .attr("opacity", 0.35);
      }
    }
  });
}
