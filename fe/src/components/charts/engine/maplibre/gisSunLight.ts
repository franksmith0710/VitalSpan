import type { LightSpecification } from "maplibre-gl";
import type { GisProjectSun } from "@/components/charts/engine/maplibre/gisProjectSun";

export const DEFAULT_GIS_SUN_DATE = "2024-06-21";
export const DEFAULT_GIS_SUN_TIME_MINUTES = 17 * 60 + 36;
export const DEFAULT_GIS_SUN_ANIMATION_SPEED = 100;
export const DEFAULT_GIS_SUN_NIGHT_SHADOW = 0.85;

/** 将本地时间（0–1439 分）映射为 MapLibre 光源（简化日弧：06:00 东 → 12:00 顶 → 18:00 西）。 */
export function computeSunLightFromMinutes(
  timeMinutes: number,
  nightShadow = DEFAULT_GIS_SUN_NIGHT_SHADOW,
): LightSpecification {
  const hour = ((timeMinutes % 1440) + 1440) % 1440 / 60;
  const dayPhase = (hour - 6) / 12;
  const daylight = Math.max(0, Math.sin(Math.max(0, Math.min(1, dayPhase)) * Math.PI));
  const elevation = daylight * 85;
  const azimuth = 90 + Math.max(0, Math.min(1, dayPhase)) * 180;
  const polar = Math.max(8, 90 - elevation);
  const shadowDim = Math.max(0, Math.min(1, nightShadow));
  const intensity = 0.06 + daylight * 0.42 * (1 - shadowDim * (1 - daylight));
  const color = daylight > 0.2 ? "#ffffff" : daylight > 0.05 ? "#c8d8f0" : "#506080";
  return {
    anchor: "map",
    color,
    intensity,
    position: [1.15, azimuth % 360, polar],
  };
}

export function resolveSunTimeMinutes(sun: GisProjectSun | undefined): number {
  const raw = Number(sun?.timeMinutes);
  if (Number.isFinite(raw)) return Math.max(0, Math.min(1439, Math.round(raw)));
  return DEFAULT_GIS_SUN_TIME_MINUTES;
}

export function resolveSunNightShadow(sun: GisProjectSun | undefined): number {
  const raw = Number(sun?.nightShadow);
  if (Number.isFinite(raw)) return Math.max(0, Math.min(1, raw));
  return DEFAULT_GIS_SUN_NIGHT_SHADOW;
}

export function formatSunTimeLabel(timeMinutes: number): string {
  const normalized = ((timeMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseSunTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}
