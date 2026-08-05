import type { D3LegendItem, D3LegendLayout } from "@/components/charts/engine/d3/core/d3Legend";
import { reserveLegendMargin } from "@/components/charts/engine/d3/core/d3Legend";

/** 饼图默认外半径占可用半径比例（对标 DE 饼图贴边感） */
export const PIE_RADIUS_FRAC_DEFAULT = 0.92;

const PIE_PAD = { top: 8, right: 8, bottom: 8, left: 8 };

export type PieLayout = {
  margin: { top: number; right: number; bottom: number; left: number };
  cx: number;
  cy: number;
  maxR: number;
  legendMode: "none" | "inline" | "right";
  legendBox?: { x: number; y: number; w: number; h: number };
};

/** 宽扁组件：图例放右侧；否则内联图例由 reserveLegendMargin 预留边距 */
export function computePieLayout(
  width: number,
  height: number,
  showLegend: boolean,
  legendLayout?: D3LegendLayout,
  legendItems: D3LegendItem[] = [],
  outsideLabels = false,
): PieLayout {
  const base = { ...PIE_PAD };
  const position = legendLayout?.position ?? "bottom";
  const innerW0 = Math.max(0, width - base.left - base.right);
  const innerH0 = Math.max(0, height - base.top - base.bottom);
  const wide = innerW0 > innerH0 * 1.35;
  const useSideLegend = showLegend && wide;
  const sidePosition = position === "left" ? "left" : "right";

  if (useSideLegend) {
    const legendW = Math.min(112, Math.max(76, innerW0 * 0.28));
    const gap = 6;
    const pieW = innerW0 - legendW - gap;
    const maxR = Math.min(pieW, innerH0) / 2;
    const margin = {
      ...base,
      [sidePosition]: base[sidePosition] + legendW + gap,
    };
    const cx =
      sidePosition === "left"
        ? margin.left + pieW / 2
        : base.left + pieW / 2;
    const cy = base.top + innerH0 / 2;
    const legendX = sidePosition === "left" ? base.left : base.left + pieW + gap;
    return {
      margin,
      cx,
      cy,
      maxR,
      legendMode: "right",
      legendBox: { x: legendX, y: base.top, w: legendW, h: innerH0 },
    };
  }

  let margin = base;
  if (outsideLabels) {
    const innerW0 = Math.max(0, width - base.left - base.right);
    const extra = Math.min(72, Math.max(40, innerW0 * 0.14));
    margin = { ...margin, left: margin.left + extra, right: margin.right + extra };
  }
  if (showLegend) {
    margin = reserveLegendMargin(margin, width, height, legendLayout, legendItems);
  }
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const maxR = Math.min(innerW, innerH) / 2;

  return {
    margin,
    cx: margin.left + innerW / 2,
    cy: margin.top + innerH / 2,
    maxR,
    legendMode: showLegend ? "inline" : "none",
  };
}
