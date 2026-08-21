import type { StyleSpecification } from "maplibre-gl";
import { gisFogToMapLibreSky } from "@/components/charts/engine/maplibre/gisAtmosphereSky";
import type { GisAtmospherePreset, GisProjectFog, GisProjection } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

export type GisMapCamera = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

export function captureGisMapCamera(map: MapLibreMap): GisMapCamera {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

export function restoreGisMapCamera(map: MapLibreMap, camera: GisMapCamera) {
  map.jumpTo({
    center: camera.center,
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: camera.pitch,
  });
}

export function applyGisMapStylePreservingCamera(
  map: MapLibreMap,
  style: StyleSpecification,
  onReady?: () => void,
) {
  const camera = captureGisMapCamera(map);
  map.setStyle(style);
  map.once("style.load", () => {
    const restore = () => restoreGisMapCamera(map, camera);
    restore();
    map.resize();
    restore();
    map.once("idle", () => {
      restore();
      onReady?.();
    });
  });
}

export type GlobeAtmosphereState = {
  projection?: GisProjection;
  fog?: GisProjectFog;
  atmospherePreset?: GisAtmospherePreset;
};

function whenMapStyleReady(map: MapLibreMap, run: () => void) {
  if (map.isStyleLoaded()) {
    run();
    return;
  }
  map.once("load", run);
}

export function applyGlobeAtmosphere(
  map: MapLibreMap,
  state: GlobeAtmosphereState,
  options?: { preserveCamera?: boolean },
) {
  const camera = options?.preserveCamera ? captureGisMapCamera(map) : null;
  whenMapStyleReady(map, () => {
    if (state.projection === "globe") {
      map.setProjection({ type: "globe" });
      map.setSky(gisFogToMapLibreSky(state.fog, state.atmospherePreset));
    } else {
      map.setProjection({ type: "mercator" });
      map.setSky(undefined);
    }
    if (camera) restoreGisMapCamera(map, camera);
  });
}

export function syncGisMapView(
  map: MapLibreMap,
  view: { center: [number, number]; zoom: number; bearing?: number; pitch?: number },
) {
  if (!map.isStyleLoaded()) return false;
  map.jumpTo({
    center: view.center,
    zoom: view.zoom,
    bearing: view.bearing ?? 0,
    pitch: view.pitch ?? 0,
  });
  return true;
}

export function buildGisConfiguredViewKey(view: {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}): string {
  return JSON.stringify({
    center: view.center,
    zoom: view.zoom,
    bearing: view.bearing ?? 0,
    pitch: view.pitch ?? 0,
  });
}

/** 地球真实自转角速度（°/秒）：360° / 86400s。 */
export const REAL_EARTH_ROTATION_DEG_PER_SEC = 360 / 86400;

/** 大屏待机可见慢速（约 8 分钟一圈），仍沿地轴自西向东。 */
export const GLOBE_IDLE_ROTATION_DEG_PER_SEC = 360 / (8 * 60);

export function normalizeGlobeLongitude(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped;
}

export function advanceGlobeLongitude(lng: number, speedDegPerSec: number, deltaSec: number): number {
  // 地球自西向东转：观测经度向西退，表面相对向东。
  return normalizeGlobeLongitude(lng - speedDegPerSec * deltaSec);
}

export async function mountGisMapControls(
  map: MapLibreMap,
  showControls: boolean,
): Promise<() => void> {
  const maplibregl = await import("maplibre-gl");
  const nav = new maplibregl.NavigationControl({ visualizePitch: true });
  const scale = new maplibregl.ScaleControl({ maxWidth: 96, unit: "metric" });
  if (showControls) {
    map.addControl(nav, "top-right");
    map.addControl(scale, "bottom-left");
  }
  return () => {
    if (showControls) {
      map.removeControl(nav);
      map.removeControl(scale);
    }
  };
}

export function startGisGlobeAutoRotate(
  map: MapLibreMap,
  speedDegPerSec: number = GLOBE_IDLE_ROTATION_DEG_PER_SEC,
): () => void {
  let frameId = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const deltaSec = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (map.isStyleLoaded()) {
      const center = map.getCenter();
      const lng = advanceGlobeLongitude(center.lng, speedDegPerSec, deltaSec);
      if (lng !== center.lng) {
        map.setCenter([lng, center.lat]);
      }
    }
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}
