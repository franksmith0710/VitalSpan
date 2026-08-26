import type { GisAtmospherePreset } from "@/components/charts/engine/maplibre/gisProject";
import type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
import type { ResolvedGisProjectHalo } from "@/components/charts/engine/maplibre/gisProjectHalo";
import {
  GEOLIBRE_HALO_OUTER_SCALE,
  GEOLIBRE_HALO_STOPS_DAY,
  GEOLIBRE_HALO_STOPS_NIGHT,
  type HaloColorStop,
} from "@/components/charts/engine/maplibre/gisGlobeHaloStops";

function applyHaloGradientStops(
  gradient: CanvasGradient,
  preset: GisAtmospherePreset | undefined,
) {
  const stops: HaloColorStop[] =
    preset === "day" ? GEOLIBRE_HALO_STOPS_DAY : GEOLIBRE_HALO_STOPS_NIGHT;
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
  applyHaloGradientStops(gradient, preset);

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = haloOpacity;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
