import * as d3 from "d3";

export type GeoSurfacePalette = {
  emptyFill: string;
  hoverFill: string;
  hoverGlow: string;
  border: string;
  borderBright: string;
  rangeLow: string;
  rangeMid: string;
  rangeHigh: string;
  rangePeak: string;
  plotBgCenter: string;
  plotBgEdge: string;
  glow: string;
};

/** 2D/3D 离线地图共用视觉色板（大屏数据感） */
export function geoSurfaceColors(isDark: boolean): GeoSurfacePalette {
  if (isDark) {
    return {
      emptyFill: "#1a3352",
      hoverFill: "#38bdf8",
      hoverGlow: "#22d3ee",
      border: "rgba(125, 211, 252, 0.28)",
      borderBright: "rgba(186, 230, 253, 0.95)",
      rangeLow: "#042f2e",
      rangeMid: "#0e7490",
      rangeHigh: "#0284c7",
      rangePeak: "#67e8f9",
      plotBgCenter: "#0f2744",
      plotBgEdge: "#020617",
      glow: "#22d3ee",
    };
  }
  return {
    emptyFill: "#c9dcf0",
    hoverFill: "#1d4ed8",
    hoverGlow: "#2563eb",
    border: "rgba(30, 64, 175, 0.35)",
    borderBright: "rgba(29, 78, 216, 0.95)",
    rangeLow: "#bae6fd",
    rangeMid: "#38bdf8",
    rangeHigh: "#2563eb",
    rangePeak: "#1e3a8a",
    plotBgCenter: "#eff6ff",
    plotBgEdge: "#dbeafe",
    glow: "#3b82f6",
  };
}

export function colorForGeoValue(
  value: number,
  min: number,
  max: number,
  surface: GeoSurfacePalette,
): string {
  if (!Number.isFinite(value) || value <= 0) return surface.emptyFill;
  if (max <= 0) return surface.emptyFill;
  const t = max <= min ? 1 : (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, t));
  const stops = [surface.rangeLow, surface.rangeMid, surface.rangeHigh, surface.rangePeak];
  const scaled = clamped * 3;
  const index = Math.min(2, Math.floor(scaled));
  const frac = scaled - index;
  return d3.interpolateRgb(stops[index], stops[index + 1])(frac);
}

/** 悬停高亮：仅在指针位于该省时显示，移开即恢复 */
export function colorForGeoHover(
  value: number,
  min: number,
  max: number,
  surface: GeoSurfacePalette,
): string {
  const base = colorForGeoValue(value, min, max, surface);
  if (value > 0) {
    return d3.interpolateRgb(base, surface.rangePeak)(0.34);
  }
  return d3.interpolateRgb(surface.emptyFill, surface.rangeMid)(0.5);
}

export function geoValueIntensity(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0 || max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function geoStrokeWidth(chartWidth: number): number {
  return Math.max(0.75, Math.min(1.2, chartWidth / 320));
}
