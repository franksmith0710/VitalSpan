import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

export type GlobeScreenBounds = {
  x: number;
  y: number;
  radius: number;
  bearing: number;
  pitch: number;
  centerLng: number;
  centerLat: number;
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

  const center = map.getCenter();

  return {
    x: transform.centerPoint.x,
    y: transform.centerPoint.y,
    radius: radius * pitchScale,
    bearing: map.getBearing(),
    pitch,
    centerLng: center.lng,
    centerLat: center.lat,
  };
}

export function resolveGlobeScreenBoundsFallback(
  width: number,
  height: number,
): GlobeScreenBounds {
  const radius = Math.min(width, height) * 0.42;
  return { x: width / 2, y: height / 2, radius, bearing: 0, pitch: 0, centerLng: 100, centerLat: 28 };
}

/** 星空与球面同向旋转：bearing + 中心经度。 */
export function resolveGlobeStarViewRotation(globe: GlobeScreenBounds): number {
  return globe.bearing + globe.centerLng;
}

export function isInsideGlobeDisc(
  x: number,
  y: number,
  globe: GlobeScreenBounds,
  inset = 0.98,
): boolean {
  const dx = x - globe.x;
  const dy = y - globe.y;
  const r = globe.radius * inset;
  return dx * dx + dy * dy < r * r;
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

export type GlobeLimbBounds = {
  x: number;
  y: number;
  radius: number;
};

type SurfaceProbeTransform = {
  centerPoint: { x: number; y: number };
  width: number;
  height: number;
  isPointOnMapSurface: (point: { x: number; y: number }) => boolean;
};

function isOnGlobeSurface(transform: SurfaceProbeTransform, x: number, y: number): boolean {
  return transform.isPointOnMapSurface({ x, y });
}

function raycastGlobeEdgeAlongBearing(
  transform: SurfaceProbeTransform,
  cx: number,
  cy: number,
  angle: number,
): { x: number; y: number; radius: number } | null {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const maxScan = Math.max(transform.width, transform.height) * 0.75;
  let lo = 0;
  let hi = maxScan;

  for (let step = 0; step < 14; step += 1) {
    const mid = (lo + hi) / 2;
    if (isOnGlobeSurface(transform, cx + dirX * mid, cy + dirY * mid)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (lo <= 0.5) return null;
  return { x: cx + dirX * lo, y: cy + dirY * lo, radius: lo };
}

/** 沿球面 90° 采样 + map.project（GeoLibre / Leonel Dias）。 */
export function resolveGlobeLimbBoundsFromProject(map: MapLibreMap): GlobeLimbBounds | null {
  const center = map.getCenter();
  const clng = (center.lng * Math.PI) / 180;
  const clat = (center.lat * Math.PI) / 180;
  const points: { x: number; y: number }[] = [];
  const numSamples = 16;

  for (let i = 0; i < numSamples; i += 1) {
    const bearing = (i / numSamples) * 2 * Math.PI;
    const edgeLat = Math.asin(
      Math.sin(clat) * Math.cos(Math.PI / 2) +
        Math.cos(clat) * Math.sin(Math.PI / 2) * Math.cos(bearing),
    );
    const edgeLng =
      clng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(Math.PI / 2) * Math.cos(clat),
        Math.cos(Math.PI / 2) - Math.sin(clat) * Math.sin(edgeLat),
      );
    const px = map.project([(edgeLng * 180) / Math.PI, (edgeLat * 180) / Math.PI]);
    if (Number.isFinite(px.x) && Number.isFinite(px.y)) {
      points.push(px);
    }
  }

  if (points.length < 3) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    radius: Math.max(maxX - minX, maxY - minY) / 2,
  };
}

function limbFromScreenBounds(map: MapLibreMap): GlobeLimbBounds | null {
  const bounds = resolveGlobeScreenBounds(map);
  if (!bounds) return null;
  return { x: bounds.x, y: bounds.y, radius: bounds.radius };
}

/** 用 MapLibre transform 的球面探测对齐真实渲染球缘（zoom / pitch 均跟随）。 */
export function resolveGlobeLimbBoundsFromMap(map: MapLibreMap): GlobeLimbBounds | null {
  const transform = (map as unknown as { transform?: SurfaceProbeTransform }).transform;
  if (!transform?.centerPoint || typeof transform.isPointOnMapSurface !== "function") {
    return null;
  }
  if (transform.width <= 0 || transform.height <= 0) return null;

  const cx = transform.centerPoint.x;
  const cy = transform.centerPoint.y;

  const edges: { x: number; y: number }[] = [];
  const bearings = 64;
  for (let i = 0; i < bearings; i += 1) {
    const angle = (i / bearings) * Math.PI * 2;
    const hit = raycastGlobeEdgeAlongBearing(transform, cx, cy, angle);
    if (hit) edges.push({ x: hit.x, y: hit.y });
  }

  if (edges.length < 8) return null;

  let limbX = 0;
  let limbY = 0;
  for (const edge of edges) {
    limbX += edge.x;
    limbY += edge.y;
  }
  limbX /= edges.length;
  limbY /= edges.length;

  let radius = 0;
  for (const edge of edges) {
    radius += Math.hypot(edge.x - limbX, edge.y - limbY);
  }
  radius /= edges.length;

  if (!Number.isFinite(radius) || radius <= 0) return null;
  return { x: limbX, y: limbY, radius };
}

export function offsetMapPixelToOverlay(
  map: MapLibreMap,
  overlay: HTMLElement,
  point: GlobeLimbBounds,
): GlobeLimbBounds {
  const mapRect = map.getContainer().getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  return {
    x: point.x + (mapRect.left - overlayRect.left),
    y: point.y + (mapRect.top - overlayRect.top),
    radius: point.radius,
  };
}

/** 多策略解析球缘，并映射到 overlay 容器坐标；始终有 fallback，避免光晕层消失。 */
export function resolveGlobeLimbBoundsForOverlay(
  map: MapLibreMap | null,
  overlay: HTMLElement,
  width: number,
  height: number,
): GlobeLimbBounds {
  const fallback = resolveGlobeScreenBoundsFallback(width, height);
  if (!map) {
    return fallback;
  }

  const inMapPixels =
    resolveGlobeLimbBoundsFromMap(map) ??
    resolveGlobeLimbBoundsFromProject(map) ??
    limbFromScreenBounds(map) ??
    fallback;

  if (map.getContainer() === overlay) {
    return inMapPixels;
  }
  return offsetMapPixelToOverlay(map, overlay, inMapPixels);
}
