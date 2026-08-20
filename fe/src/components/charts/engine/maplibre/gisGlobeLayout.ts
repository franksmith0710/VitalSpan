import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

export type GlobeScreenBounds = {
  x: number;
  y: number;
  radius: number;
  bearing: number;
  pitch: number;
};

type MapTransform = {
  centerPoint: { x: number; y: number };
  worldSize: number;
  center: { lat: number };
  width: number;
  height: number;
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

export function resolveGlobeScreenBounds(map: MapLibreMap | null): GlobeScreenBounds | null {
  if (!map) return null;

  const transform = (map as unknown as { transform?: MapTransform }).transform;
  if (!transform?.centerPoint || !Number.isFinite(transform.worldSize)) return null;

  const width = transform.width || map.getContainer().clientWidth;
  const height = transform.height || map.getContainer().clientHeight;
  if (width <= 0 || height <= 0) return null;

  const radius = getGlobeRadiusPixels(transform.worldSize, transform.center.lat);
  const pitch = map.getPitch();
  const pitchScale = Math.max(0.35, Math.cos((pitch * Math.PI) / 180));

  return {
    x: transform.centerPoint.x,
    y: transform.centerPoint.y,
    radius: radius * pitchScale,
    bearing: map.getBearing(),
    pitch,
  };
}

export function resolveGlobeScreenBoundsFallback(
  width: number,
  height: number,
): GlobeScreenBounds {
  const radius = Math.min(width, height) * 0.42;
  return { x: width / 2, y: height / 2, radius, bearing: 0, pitch: 0 };
}

export function bindMapRenderSync(map: MapLibreMap | null, paint: () => void): () => void {
  if (!map) return () => undefined;
  const onRender = () => paint();
  map.on("render", onRender);
  map.on("move", onRender);
  map.on("rotate", onRender);
  map.on("pitch", onRender);
  map.on("zoom", onRender);
  map.on("resize", onRender);
  return () => {
    map.off("render", onRender);
    map.off("move", onRender);
    map.off("rotate", onRender);
    map.off("pitch", onRender);
    map.off("zoom", onRender);
    map.off("resize", onRender);
  };
}
