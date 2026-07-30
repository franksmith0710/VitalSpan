import type { ChartGeoStyle } from "@/lib/chartDeStyle";
import { geoSurfaceColors } from "@/components/charts/engine/geo/geoSurfaceColors";

function isValidHex(color?: string): color is string {
  return Boolean(color && /^#[0-9a-fA-F]{6}$/.test(color));
}

export function hasCustomGeoRegionFillColor(geo: ChartGeoStyle = {}): boolean {
  return isValidHex(geo.regionFillColor?.trim());
}

export function resolveGeoRegionFillColorHex(geo: ChartGeoStyle, isDark: boolean): string {
  const custom = geo.regionFillColor?.trim();
  if (isValidHex(custom)) return custom.toLowerCase();
  return geoSurfaceColors(isDark).emptyFill;
}

export function buildGeoMapStyleContentSig(
  geo: ChartGeoStyle = {},
  extras: { paletteOpacity?: number; paletteId?: string } = {},
): string {
  return [
    geo.showRegionBorder !== false ? 1 : 0,
    geo.regionBorderColor?.toLowerCase() ?? "",
    geo.regionFillColor?.toLowerCase() ?? "",
    geo.showZoomControl ? 1 : 0,
    extras.paletteOpacity ?? "",
    extras.paletteId ?? "",
  ].join("|");
}
