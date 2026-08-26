import type { GisAtmospherePreset } from "@/components/charts/engine/maplibre/gisProject";
import {
  GEOLIBRE_HALO_OUTER_SCALE,
  GEOLIBRE_HALO_PUNCH_INSET,
} from "@/components/charts/engine/maplibre/gisGlobeHaloStops";

export type GisProjectHalo = {
  /** 光晕外缘相对球缘半径倍数；GeoLibre 默认 2.8 */
  outerScale?: number;
  /** 内缘相对球缘 inset；GeoLibre 默认 0.965 */
  punchInset?: number;
  /** Canvas screen 混合不透明度 0–1 */
  opacity?: number;
};

export type ResolvedGisProjectHalo = {
  outerScale: number;
  punchInset: number;
  opacity: number;
};

export function resolveGisProjectHalo(
  halo: GisProjectHalo | undefined,
  _preset: GisAtmospherePreset | undefined,
): ResolvedGisProjectHalo {
  const outerRaw = Number(halo?.outerScale);
  const punchRaw = Number(halo?.punchInset);
  const opacityRaw = Number(halo?.opacity);
  return {
    outerScale:
      Number.isFinite(outerRaw) && outerRaw >= 1 && outerRaw <= 6
        ? outerRaw
        : GEOLIBRE_HALO_OUTER_SCALE,
    punchInset:
      Number.isFinite(punchRaw) && punchRaw >= 0.5 && punchRaw <= 1
        ? punchRaw
        : GEOLIBRE_HALO_PUNCH_INSET,
    opacity:
      Number.isFinite(opacityRaw) && opacityRaw >= 0 && opacityRaw <= 1 ? opacityRaw : 1,
  };
}

export function normalizeGisProjectHalo(input: unknown): GisProjectHalo | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as GisProjectHalo;
  const next: GisProjectHalo = {};
  const outerScale = Number(raw.outerScale);
  if (Number.isFinite(outerScale) && outerScale >= 1 && outerScale <= 6) {
    next.outerScale = outerScale;
  }
  const punchInset = Number(raw.punchInset);
  if (Number.isFinite(punchInset) && punchInset >= 0.5 && punchInset <= 1) {
    next.punchInset = punchInset;
  }
  const opacity = Number(raw.opacity);
  if (Number.isFinite(opacity) && opacity >= 0 && opacity <= 1) {
    next.opacity = opacity;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
