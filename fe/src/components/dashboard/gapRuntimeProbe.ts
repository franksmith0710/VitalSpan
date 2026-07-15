import type { GapConfigInput } from "./gapPolicy";
import { resolvePixelGutter, resolveWidgetGap } from "./gapPolicy";
import type { CanvasGapMode } from "./componentGapRuntime";
import type { PixelLayoutWidget } from "./layoutUtils";
import type { PixelLayoutWidget } from "./layoutUtils";

export type OuterRectGap = {
  aId: string;
  bId: string;
  axis: "horizontal" | "vertical";
  /** B 起始边 − A 结束边（外框坐标，≥0） */
  gapPx: number;
};

const CROSS_AXIS_OVERLAP_MIN = 1;

function crossOverlap(
  a: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">,
  b: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">,
  axis: "horizontal" | "vertical",
): number {
  if (axis === "horizontal") {
    return Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  }
  return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
}

/** 采样像素布局中外框正缝（不含重叠区域） */
export function measurePixelLayoutOuterGaps(
  widgets: Pick<PixelLayoutWidget, "id" | "x" | "y" | "width" | "height">[],
  options?: { maxGapPx?: number },
): OuterRectGap[] {
  const maxGap = options?.maxGapPx ?? 512;
  const gaps: OuterRectGap[] = [];

  for (let i = 0; i < widgets.length; i += 1) {
    for (let j = i + 1; j < widgets.length; j += 1) {
      const a = widgets[i]!;
      const b = widgets[j]!;

      if (crossOverlap(a, b, "horizontal") >= CROSS_AXIS_OVERLAP_MIN) {
        const rightGap = b.x - (a.x + a.width);
        const leftGap = a.x - (b.x + b.width);
        if (rightGap > 0 && rightGap <= maxGap) {
          gaps.push({ aId: a.id, bId: b.id, axis: "horizontal", gapPx: rightGap });
        } else if (leftGap > 0 && leftGap <= maxGap) {
          gaps.push({ aId: b.id, bId: a.id, axis: "horizontal", gapPx: leftGap });
        }
      }

      if (crossOverlap(a, b, "vertical") >= CROSS_AXIS_OVERLAP_MIN) {
        const downGap = b.y - (a.y + a.height);
        const upGap = a.y - (b.y + b.height);
        if (downGap > 0 && downGap <= maxGap) {
          gaps.push({ aId: a.id, bId: b.id, axis: "vertical", gapPx: downGap });
        } else if (upGap > 0 && upGap <= maxGap) {
          gaps.push({ aId: b.id, bId: a.id, axis: "vertical", gapPx: upGap });
        }
      }
    }
  }

  return gaps;
}

export function hasPositiveOuterGaps(
  widgets: Pick<PixelLayoutWidget, "id" | "x" | "y" | "width" | "height">[],
  thresholdPx = 1.5,
): boolean {
  return measurePixelLayoutOuterGaps(widgets).some((gap) => gap.gapPx > thresholdPx);
}

/** 外框相切时两侧 shell padding 之和 ≈ 视觉缝宽 */
export function estimateVisualGapPx(outerGapPx: number, shellPaddingPx: number): number {
  return Math.max(0, outerGapPx) + shellPaddingPx * 2;
}

export type GapLayoutAnalysis = {
  shellPaddingPx: number;
  outerGaps: OuterRectGap[];
  hasConfigGap: boolean;
  hasCoordinateGaps: boolean;
  maxOuterGapPx: number;
  estimatedMaxVisualGapPx: number;
};

/** 诊断：区分「配置间隙」与「外框坐标缝」 */
export function analyzeDashboardGapLayout(
  widgets: Pick<PixelLayoutWidget, "id" | "x" | "y" | "width" | "height">[],
  gapConfig: GapConfigInput,
  mode: CanvasGapMode = "pixel",
): GapLayoutAnalysis {
  const shellPaddingPx =
    mode === "pixel" ? resolvePixelGutter(gapConfig) : resolveWidgetGap(gapConfig);
  const outerGaps = measurePixelLayoutOuterGaps(widgets);
  const maxOuterGapPx = outerGaps.reduce((max, gap) => Math.max(max, gap.gapPx), 0);
  return {
    shellPaddingPx,
    outerGaps,
    hasConfigGap: shellPaddingPx > 0,
    hasCoordinateGaps: hasPositiveOuterGaps(widgets),
    maxOuterGapPx,
    estimatedMaxVisualGapPx: estimateVisualGapPx(maxOuterGapPx, shellPaddingPx),
  };
}
