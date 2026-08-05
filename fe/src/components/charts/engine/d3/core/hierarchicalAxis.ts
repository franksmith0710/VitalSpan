import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import {
  CARTESIAN_CATEGORY_KEY_SEP,
  formatCategoryCellValue,
  inferCompositeCategoryLevels,
} from "@/components/charts/engine/buildDatasetEncoding";
import {
  axisCategoryDisplayText,
  axisLabelFitsSlot,
  pickCategoryTicksForLabels,
} from "@/components/charts/engine/d3/core/axes";
import { resolveAxisFontSize } from "@/components/charts/engine/d3/core/chartVisualTokens";
import type { ChartAxisStyle } from "@/lib/chartDeStyleBlocks";

const ROW_HEIGHT = 16;
/** 对标 DataEase：底行只展示部分刻度，保证间距 */
const THINNING_TICK_MIN_PX = 72;
const PARENT_LABEL_MIN_PX = 56;

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

/** 最细粒度层（每点一段的层）用于底行抽稀 */
export function resolveFinestLevelForThinning(
  categories: string[],
  structuralLevelCount: number,
  activeLevels: number[],
): number {
  let finest = activeLevels[activeLevels.length - 1]!;
  let maxPointSegments = 0;
  for (const level of activeLevels) {
    const segments = buildCategoryLevelSegments(categories, level, structuralLevelCount);
    const pointLike = segments.filter((segment) => segment.end === segment.start).length;
    if (pointLike > maxPointSegments) {
      maxPointSegments = pointLike;
      finest = level;
    }
  }
  return finest;
}

export type HierarchicalAxisPlan = {
  structuralLevelCount: number;
  activeLevels: number[];
  visibleCategories: string[];
  thinningLevel: number;
  extraBottom: number;
};

/** 对标 DataEase：分层轴底行抽稀、全层水平标签（不旋转进绘图区） */
export function planHierarchicalCategoryAxis(
  categories: string[],
  innerW: number,
): HierarchicalAxisPlan | null {
  if (categories.length === 0 || innerW <= 0) return null;

  const structuralLevelCount = inferCompositeCategoryLevels(categories);
  const activeLevels = resolveActiveCategoryLevels(categories, structuralLevelCount);
  if (activeLevels.length <= 1) return null;

  const thinningLevel = resolveFinestLevelForThinning(categories, structuralLevelCount, activeLevels);
  const visibleCategories = pickCategoryTicksForLabels(
    categories,
    innerW,
    (category) => splitCompositeCategoryParts(category, structuralLevelCount)[thinningLevel] ?? "",
    THINNING_TICK_MIN_PX,
  );

  return {
    structuralLevelCount,
    activeLevels,
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
  visibleSet: Set<string>,
  categories: string[],
  slotSpan: number,
): boolean {
  if (!segment.label) return false;

  if (level === thinningLevel) {
    const anchor = categories[segment.start]!;
    return visibleSet.has(anchor);
  }

  if (segment.end > segment.start) {
    return axisLabelFitsSlot(axisCategoryDisplayText(segment.label), slotSpan, 0);
  }
  return slotSpan >= PARENT_LABEL_MIN_PX && axisLabelFitsSlot(axisCategoryDisplayText(segment.label), slotSpan, 0);
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

  const { structuralLevelCount, activeLevels, visibleCategories, thinningLevel } = plan;
  const visibleSet = new Set(visibleCategories);
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
    const segments = buildCategoryLevelSegments(opts.categories, level, structuralLevelCount);

    for (const segment of segments) {
      const slotSpan = segmentSpanPx(
        opts.xScale,
        opts.categories,
        segment.start,
        segment.end,
        opts.innerW,
      );
      if (
        !shouldDrawSegmentLabel(segment, level, thinningLevel, visibleSet, opts.categories, slotSpan)
      ) {
        continue;
      }

      const display = axisCategoryDisplayText(segment.label);
      if (!display) continue;

      axisRoot
        .append("text")
        .attr("x", segmentCenterPx(opts.xScale, opts.categories, segment.start, segment.end))
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
          opts.categories,
          segment.start,
          segment.end,
          opts.innerW,
        );
        if (
          !shouldDrawSegmentLabel(segment, level, thinningLevel, visibleSet, opts.categories, slotSpan)
        ) {
          continue;
        }
        const x = segmentCenterPx(opts.xScale, opts.categories, segment.start, segment.end);
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
