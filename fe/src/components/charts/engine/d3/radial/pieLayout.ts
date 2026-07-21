/** 饼图默认外半径占可用半径比例（对标 DE 饼图贴边感） */
export const PIE_RADIUS_FRAC_DEFAULT = 0.92;

const PIE_PAD = { top: 8, right: 8, bottom: 8, left: 8 };

export type PieLayout = {
  margin: { top: number; right: number; bottom: number; left: number };
  cx: number;
  cy: number;
  maxR: number;
  legendMode: "none" | "top" | "right";
  legendBox?: { x: number; y: number; w: number; h: number };
};

/** 宽扁组件：图例放右侧，饼图用满高度而非挤在中间小圆 */
export function computePieLayout(width: number, height: number, showLegend: boolean): PieLayout {
  const base = PIE_PAD;
  const innerW0 = Math.max(0, width - base.left - base.right);
  const innerH0 = Math.max(0, height - base.top - base.bottom);
  const wide = innerW0 > innerH0 * 1.35;

  if (showLegend && wide) {
    const legendW = Math.min(112, Math.max(76, innerW0 * 0.28));
    const gap = 6;
    const pieW = innerW0 - legendW - gap;
    const maxR = Math.min(pieW, innerH0) / 2;
    const cx = base.left + pieW / 2;
    const cy = base.top + innerH0 / 2;
    return {
      margin: { ...base, right: base.right + legendW + gap },
      cx,
      cy,
      maxR,
      legendMode: "right",
      legendBox: { x: base.left + pieW + gap, y: base.top, w: legendW, h: innerH0 },
    };
  }

  if (showLegend) {
    const margin = { ...base, top: base.top + 20 };
    const innerW = Math.max(0, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);
    const maxR = Math.min(innerW, innerH) / 2;
    return {
      margin,
      cx: margin.left + innerW / 2,
      cy: margin.top + innerH / 2,
      maxR,
      legendMode: "top",
    };
  }

  const innerW = innerW0;
  const innerH = innerH0;
  const maxR = Math.min(innerW, innerH) / 2;
  return {
    margin: base,
    cx: base.left + innerW / 2,
    cy: base.top + innerH / 2,
    maxR,
    legendMode: "none",
  };
}
