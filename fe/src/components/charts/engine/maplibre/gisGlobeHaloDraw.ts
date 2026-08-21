import type { GisAtmospherePreset } from "@/components/charts/engine/maplibre/gisProject";
import type { GlobeSilhouette } from "@/components/charts/engine/maplibre/gisGlobeSilhouette";
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
 * GeoLibre / Leonel Dias：screen 混合 + 椭球缘单位圆渐变，clip 仅外环（叠在地图之上）。
 */
export function drawGlobeAtmosphereHalo(
  ctx: CanvasRenderingContext2D,
  _width: number,
  _height: number,
  silhouette: GlobeSilhouette,
  preset: GisAtmospherePreset | undefined,
) {
  const { cx, cy, rx, ry, rotation } = silhouette;
  const outer = GEOLIBRE_HALO_OUTER_SCALE;
  const punch = GEOLIBRE_HALO_PUNCH_INSET;

  ctx.clearRect(0, 0, _width, _height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(rx, ry);

  const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, outer);
  applyHaloGradientStops(gradient, preset);

  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, Math.PI * 2);
  ctx.arc(0, 0, punch, 0, Math.PI * 2, true);
  ctx.clip("evenodd");

  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(-outer, -outer, outer * 2, outer * 2);
  ctx.restore();
}
