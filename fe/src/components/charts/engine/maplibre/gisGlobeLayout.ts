import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

export type GlobeScreenBounds = {
  x: number;
  y: number;
  radius: number;
};

type MapTransform = {
  centerPoint: { x: number; y: number };
  worldSize: number;
  center: { lat: number };
};

/** 与 MapLibre globe 投影内部算法一致。 */
export function getGlobeRadiusPixels(worldSize: number, latitudeDegrees: number): number {
  const latRad = (latitudeDegrees * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  if (!Number.isFinite(cosLat) || Math.abs(cosLat) < 1e-6) {
    return worldSize / (2 * Math.PI);
  }
  return worldSize / (2 * Math.PI) / cosLat;
}

export function resolveGlobeScreenBounds(
  map: MapLibreMap | null,
  fallbackWidth: number,
  fallbackHeight: number,
): GlobeScreenBounds {
  if (!map) {
    const radius = Math.min(fallbackWidth, fallbackHeight) * 0.42;
    return { x: fallbackWidth / 2, y: fallbackHeight / 2, radius };
  }

  const transform = (map as unknown as { transform?: MapTransform }).transform;
  if (!transform?.centerPoint || !Number.isFinite(transform.worldSize)) {
    const radius = Math.min(fallbackWidth, fallbackHeight) * 0.42;
    return { x: fallbackWidth / 2, y: fallbackHeight / 2, radius };
  }

  return {
    x: transform.centerPoint.x,
    y: transform.centerPoint.y,
    radius: getGlobeRadiusPixels(transform.worldSize, transform.center.lat),
  };
}

export function bindMapRenderSync(map: MapLibreMap | null, paint: () => void): () => void {
  if (!map) return () => undefined;
  map.on("render", paint);
  return () => map.off("render", paint);
}
