import type { GisProjectFog, GisProjection } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

export function applyGlobeAtmosphere(
  map: MapLibreMap,
  projection: GisProjection | undefined,
  fog: GisProjectFog | undefined,
) {
  if (projection === "globe") {
    map.setProjection({ type: "globe" });
    const setFog = (map as unknown as { setFog?: (spec: Record<string, unknown>) => void }).setFog;
    setFog?.((fog ?? {}) as Record<string, unknown>);
  } else {
    map.setProjection({ type: "mercator" });
    const setFog = (map as unknown as { setFog?: (spec: Record<string, unknown>) => void }).setFog;
    setFog?.({});
  }
}

export function syncGisMapView(
  map: MapLibreMap,
  view: { center: [number, number]; zoom: number; bearing?: number; pitch?: number },
) {
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
