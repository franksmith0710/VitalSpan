export const chartPalette = {
  brand: "#465fff", // @design-token-ok
  purple: "#7a5af8", // @design-token-ok
  success: "#12b76a", // @design-token-ok
  info: "#0ba5ec", // @design-token-ok
  pink: "#ee46bc", // @design-token-ok
} as const;

export const chartColors = Object.values(chartPalette);

export const CHART_PALETTE_PRESETS = {
  default: [...chartColors],
  tech: ["#465fff", "#0ba5ec", "#12b76a", "#7a5af8", "#ee46bc"],
  business: ["#344054", "#475467", "#667085", "#98a2b3", "#d0d5dd"],
  warm: ["#f79009", "#f04438", "#f63d68", "#ee46bc", "#fdb022"],
} as const;

export type ChartPaletteId = keyof typeof CHART_PALETTE_PRESETS;

export function resolveChartColors(
  paletteId?: string,
  custom?: string[],
): string[] {
  if (custom?.length) return custom;
  if (paletteId && paletteId in CHART_PALETTE_PRESETS) {
    return [...CHART_PALETTE_PRESETS[paletteId as ChartPaletteId]];
  }
  return [...chartColors];
}

export const chartFontFamily = "Outfit, sans-serif";
