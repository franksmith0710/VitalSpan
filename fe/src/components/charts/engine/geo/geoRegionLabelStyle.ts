import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import type { ChartGeoStyle } from "@/lib/chartDeStyle";

/** 区域标签默认字号（可选下限 6，默认可读性仍用 10） */
export const DEFAULT_GEO_REGION_LABEL_FONT_SIZE = 10;

function isValidHex(color?: string): color is string {
  return Boolean(color && /^#[0-9a-fA-F]{6}$/.test(color));
}

export function hasCustomGeoRegionLabelColor(geo: ChartGeoStyle = {}): boolean {
  return isValidHex(geo.regionLabelColor?.trim());
}

export function resolveGeoRegionLabelFontSize(geo: ChartGeoStyle = {}): number {
  return geo.regionLabelFontSize ?? DEFAULT_GEO_REGION_LABEL_FONT_SIZE;
}
export function resolveGeoRegionLabelFallbackHex(isDark: boolean): string {
  return isDark ? "#cbd5e1" : "#475569";
}

export function resolveGeoRegionLabelColorHex(
  geo: ChartGeoStyle,
  theme: AntvThemeTokens,
): string {
  const custom = geo.regionLabelColor?.trim();
  if (isValidHex(custom)) return custom.toLowerCase();
  return resolveLabelFill(theme);
}

/** 样式面板取色：自定义色 > 主题默认 */
export function resolveGeoRegionLabelPanelColorHex(geo: ChartGeoStyle, isDark: boolean): string {
  const custom = geo.regionLabelColor?.trim();
  if (isValidHex(custom)) return custom.toLowerCase();
  return resolveGeoRegionLabelFallbackHex(isDark);
}
