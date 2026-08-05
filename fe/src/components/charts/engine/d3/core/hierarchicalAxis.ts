import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import {
  CARTESIAN_CATEGORY_KEY_SEP,
  inferCompositeCategoryLevels,
} from "@/components/charts/engine/buildDatasetEncoding";
import { formatAxisCategoryLabel, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { resolveAxisFontSize } from "@/components/charts/engine/d3/core/chartVisualTokens";
import type { ChartAxisStyle } from "@/lib/chartDeStyleBlocks";

const ROW_HEIGHT = 16;

export type HierarchicalAxisLayout = {
  levelCount: number;
  extraBottom: number;
  rowHeight: number;
};

export function resolveHierarchicalAxisLayout(levelCount: number): HierarchicalAxisLayout {
  if (levelCount <= 1) {
    return { levelCount: 1, extraBottom: 0, rowHeight: ROW_HEIGHT };
  }
  return {
    levelCount,
    extraBottom: levelCount * ROW_HEIGHT + 4,
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
  const text = part.trim();
  if (!text || text === "null" || text === "undefined") return "";
  return text;
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

type DrawHierarchicalCategoryAxisOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: CategoryScale;
  categories: string[];
  levelCount: number;
  innerH: number;
  innerW: number;
  theme: AntvThemeTokens;
  axisStyle?: ChartAxisStyle;
};

/** 对标 DataEase：多维度类别轴分行展示，同级连续值合并居中 */
export function drawHierarchicalCategoryAxis(opts: DrawHierarchicalCategoryAxisOptions): void {
  const { levelCount, innerH, innerW, theme, axisStyle } = opts;
  if (levelCount <= 1 || opts.axisStyle?.x?.show === false) return;

  const fontSize = resolveAxisFontSize();
  const stroke = axisStyle?.x?.lineColor ?? theme.axisLine;
  const strokeWidth = axisStyle?.x?.lineWidth ?? 1;
  const axisRoot = opts.g.append("g").attr("class", "vs-axis-x vs-axis-x-tiered");

  axisRoot
    .append("line")
    .attr("class", "domain")
    .attr("x1", 0)
    .attr("x2", innerW)
    .attr("y1", innerH)
    .attr("y2", innerH)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth);

  for (let level = 0; level < levelCount; level += 1) {
    const rowY = innerH + (level + 1) * ROW_HEIGHT - 4;
    const segments = buildCategoryLevelSegments(opts.categories, level, levelCount);

    for (const segment of segments) {
      if (!segment.label) continue;
      const slotSpan = segmentSpanPx(opts.xScale, opts.categories, segment.start, segment.end, innerW);
      const label = formatAxisCategoryLabel(segment.label, slotSpan, 0);
      axisRoot
        .append("text")
        .attr("x", segmentCenterPx(opts.xScale, opts.categories, segment.start, segment.end))
        .attr("y", rowY)
        .attr("text-anchor", "middle")
        .attr("fill", theme.axisLabel)
        .style("font-size", `${fontSize}px`)
        .style("font-family", "inherit")
        .text(label);
    }

    if (level < levelCount - 1) {
      for (const segment of segments) {
        if (!segment.label) continue;
        const x = segmentCenterPx(opts.xScale, opts.categories, segment.start, segment.end);
        const half = segmentSpanPx(opts.xScale, opts.categories, segment.start, segment.end, innerW) / 2;
        axisRoot
          .append("line")
          .attr("class", "tick")
          .attr("x1", x - half)
          .attr("x2", x - half)
          .attr("y1", innerH)
          .attr("y2", rowY + 2)
          .attr("stroke", stroke)
          .attr("stroke-width", strokeWidth)
          .attr("opacity", 0.35);
        axisRoot
          .append("line")
          .attr("class", "tick")
          .attr("x1", x + half)
          .attr("x2", x + half)
          .attr("y1", innerH)
          .attr("y2", rowY + 2)
          .attr("stroke", stroke)
          .attr("stroke-width", strokeWidth)
          .attr("opacity", 0.35);
      }
    }
  }

  axisRoot.call(styleAxis, theme, fontSize, axisStyle?.x);
}
