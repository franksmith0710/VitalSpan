import { gisFogToMapLibreSky } from "@/components/charts/engine/maplibre/gisAtmosphereSky";
import type { GisAtmospherePreset, GisProjectFog, GisProjection } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

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

export function applyGlobeAtmosphere(map: MapLibreMap, state: GlobeAtmosphereState) {
  whenMapStyleReady(map, () => {
    if (state.projection === "globe") {
      map.setProjection({ type: "globe" });
      map.setSky(gisFogToMapLibreSky(state.fog, state.atmospherePreset));
      return;
    }
    map.setProjection({ type: "mercator" });
    map.setSky(undefined);
  });
}

export function syncGisMapView(
  map: MapLibreMap,
  view: { center: [number, number]; zoom: number; bearing?: number; pitch?: number },
) {
  if (!map.isStyleLoaded()) return;
  map.jumpTo({
    center: view.center,
    zoom: view.zoom,
    bearing: view.bearing ?? 0,
    pitch: view.pitch ?? 0,
  });
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
  speedDegPerSec: number,
): () => void {
  let frameId = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const deltaSec = Math.min((now - last) / 1000, 0.1);
    last = now;
    map.setBearing(map.getBearing() + speedDegPerSec * deltaSec);
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}
