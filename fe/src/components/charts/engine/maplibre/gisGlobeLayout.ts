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

/** 星场/流星挖空与裁剪用的地球圆盘半径（上限避免低 zoom 半径过大）。 */
export function resolveGlobeStarMaskRadius(
  globe: GlobeScreenBounds,
  width: number,
  height: number,
): number {
  const pitchScale = Math.max(0.35, Math.cos((globe.pitch * Math.PI) / 180));
  const fallback = Math.min(width, height) * 0.42 * pitchScale;
  return Math.min(globe.radius * 0.88 * pitchScale, fallback * 1.08);
}

/** 全球远视图才显示星场；区域放大后隐藏，避免 overlay 伪影。 */
export function shouldRenderGisStarfield(
  globe: GlobeScreenBounds,
  width: number,
  height: number,
): boolean {
  const viewportMin = Math.min(width, height);
  return globe.radius * 0.88 <= viewportMin * 0.46;
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
