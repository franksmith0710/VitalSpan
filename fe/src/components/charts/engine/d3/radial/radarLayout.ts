/** 雷达图默认半径占可用半径比例（对标饼图贴边感） */
export const RADAR_RADIUS_FRAC_DEFAULT = 0.92;

const RADAR_PAD = { top: 8, right: 8, bottom: 8, left: 8 };

export type RadarLayout = {
  cx: number;
  cy: number;
  radius: number;
  legendMode: "none" | "top" | "right";
  legendBox?: { x: number; y: number; w: number; h: number };
};

/** 宽扁组件：图例放右侧，雷达区用满高度 */
export function computeRadarLayout(
  width: number,
  height: number,
  showLegend: boolean,
  showLabel: boolean,
): RadarLayout {
  const base = RADAR_PAD;
  const innerW0 = Math.max(0, width - base.left - base.right);
  const innerH0 = Math.max(0, height - base.top - base.bottom);
  const wide = innerW0 > innerH0 * 1.35;
  const labelPad = showLabel ? 18 : 4;

  if (showLegend && wide) {
    const legendW = Math.min(72, Math.max(56, innerW0 * 0.22));
    const gap = 6;
    const radarW = innerW0 - legendW - gap;
    const radius =
      Math.max(0, Math.min(radarW, innerH0) / 2 - labelPad) * RADAR_RADIUS_FRAC_DEFAULT;
    return {
      cx: base.left + radarW / 2,
      cy: base.top + innerH0 / 2,
      radius,
      legendMode: "right",
      legendBox: { x: base.left + radarW + gap, y: base.top, w: legendW, h: innerH0 },
    };
  }

  const topLegend = showLegend ? 18 : 0;
  const innerW = innerW0;
  const innerH = Math.max(0, innerH0 - topLegend);
  const radius =
    Math.max(0, Math.min(innerW, innerH) / 2 - labelPad) * RADAR_RADIUS_FRAC_DEFAULT;

  return {
    cx: base.left + innerW / 2,
    cy: base.top + topLegend + innerH / 2,
    radius,
    legendMode: showLegend ? "top" : "none",
  };
}
