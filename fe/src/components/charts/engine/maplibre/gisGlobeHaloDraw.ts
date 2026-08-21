import type { GisAtmospherePreset } from "@/components/charts/engine/maplibre/gisProject";
import type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
import {
  GEOLIBRE_HALO_OUTER_SCALE,
  GEOLIBRE_HALO_PUNCH_INSET,
  GEOLIBRE_HALO_STOPS_DAY,
  GEOLIBRE_HALO_STOPS_NIGHT,
  type HaloColorStop,
} from "@/components/charts/engine/maplibre/gisGlobeHaloStops";

/** GeoLibre / Leonel Dias：screen 混合 + 球缘径向渐变，仅外环可见（地图层盖住球内）。 */
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
  const gradient = ctx.createRadialGradient(cx, cy, globeRadius, cx, cy, outer);
  const stops: HaloColorStop[] = preset === "day" ? GEOLIBRE_HALO_STOPS_DAY : GEOLIBRE_HALO_STOPS_NIGHT;
  for (const [position, color] of stops) {
    gradient.addColorStop(position, color);
  }

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  if (options?.clipInnerRing) {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, globeRadius * GEOLIBRE_HALO_PUNCH_INSET, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
  }

  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
