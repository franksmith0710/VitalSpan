import type { GisAtmospherePreset } from "@/components/charts/engine/maplibre/gisProject";
import type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
import {
  GEOLIBRE_HALO_OUTER_SCALE,
  GEOLIBRE_HALO_PUNCH_INSET,
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
 * GeoLibre / Leonel Dias：screen 混合 + 球缘径向渐变。
 * clipInnerRing：evenodd 仅保留 0.965×–2.8× 外环，避免球内/整盘洗白。
 */
export function drawGlobeAtmosphereHalo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  limb: GlobeLimbBounds,
  preset: GisAtmospherePreset | undefined,
  options?: { clipInnerRing?: boolean },
) {
  const { x: cx, y: cy, radius: globeRadius } = limb;
  const outer = globeRadius * GEOLIBRE_HALO_OUTER_SCALE;
  const punch = globeRadius * GEOLIBRE_HALO_PUNCH_INSET;
  const gradient = ctx.createRadialGradient(cx, cy, globeRadius, cx, cy, outer);
  applyHaloGradientStops(gradient, preset);

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  if (options?.clipInnerRing !== false) {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, punch, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
  }

  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
