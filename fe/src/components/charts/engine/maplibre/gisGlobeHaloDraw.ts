import type { GisAtmospherePreset } from "@/components/charts/engine/maplibre/gisProject";
import type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
import type { ResolvedGisProjectHalo } from "@/components/charts/engine/maplibre/gisProjectHalo";
import {
  GEOLIBRE_HALO_OUTER_SCALE,
  GEOLIBRE_HALO_STOPS_DAY,
  GEOLIBRE_HALO_STOPS_NIGHT,
  type HaloColorStop,
} from "@/components/charts/engine/maplibre/gisGlobeHaloStops";

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildHaloStopsFromColor(hex: string): HaloColorStop[] {
  return [
    [0.0, withAlpha(hex, 1)],
    [0.03, withAlpha(hex, 0.6)],
    [0.08, withAlpha(hex, 0.35)],
    [0.18, withAlpha(hex, 0.15)],
    [0.35, withAlpha(hex, 0.06)],
    [0.6, withAlpha(hex, 0.02)],
    [1.0, withAlpha(hex, 0)],
  ];
}

function applyHaloGradientStops(
  gradient: CanvasGradient,
  preset: GisAtmospherePreset | undefined,
  haloColor?: string,
) {
  const stops: HaloColorStop[] = haloColor
    ? buildHaloStopsFromColor(haloColor)
    : preset === "day"
      ? GEOLIBRE_HALO_STOPS_DAY
      : GEOLIBRE_HALO_STOPS_NIGHT;
  for (const [position, color] of stops) {
    gradient.addColorStop(position, color);
  }
}

/**
 * GeoLibre / Leonel Dias：z-3 screen 径向光晕，球内由 MapLibre canvas（z-4）遮挡，不洗白陆地。
 * @see https://leoneljdias.github.io/posts/globe-atmosphere-halo-comets/
 */
export function drawGlobeAtmosphereHalo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  limb: GlobeLimbBounds,
  preset: GisAtmospherePreset | undefined,
  halo?: ResolvedGisProjectHalo,
) {
  const { x: cx, y: cy, radius: globeRadius } = limb;
  const outerScale = halo?.outerScale ?? GEOLIBRE_HALO_OUTER_SCALE;
  const haloOpacity = halo?.opacity ?? 1;
  const outer = globeRadius * outerScale;
  const gradient = ctx.createRadialGradient(cx, cy, globeRadius, cx, cy, outer);
  applyHaloGradientStops(gradient, preset, halo?.color);

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = haloOpacity;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
