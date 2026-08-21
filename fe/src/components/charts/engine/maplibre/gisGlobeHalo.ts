import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import {
  bindMapRenderSync,
  resolveGlobeLimbBoundsForOverlay,
  resolveGlobeScreenBounds,
  resolveGlobeScreenBoundsFallback,
  shouldRenderGisStarfield,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

type MapLibreMap = import("maplibre-gl").Map;

export type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
export { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

/**
 * GeoLibre 层栈：z-3 光晕 → z-4 地图（球内自然遮挡，不外叠洗白）。
 * @see https://web.geolibre.app/
 */
export function mountGisGlobeHaloOverlay(
  wrapper: HTMLElement,
  getMap: () => MapLibreMap | null,
  preset: GisAtmospherePreset | undefined,
  projection: GisProjection | undefined,
): () => void {
  const enabled = projection === "globe";

  const canvas = document.createElement("canvas");
  canvas.dataset.testid = "gis-globe-halo";
  canvas.className = "pointer-events-none absolute inset-0 z-[3]";
  wrapper.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let running = true;
  let unbindRender: (() => void) | undefined;
  let boundMap: MapLibreMap | null = null;
  let bootFrameId = 0;
  let mapReady = false;

  const resize = () => {
    const rect = wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const bindMapIfNeeded = () => {
    const map = getMap();
    if (map && map === boundMap) return;
    unbindRender?.();
    boundMap = map;
    if (map) {
      const container = map.getContainer();
      container.style.background = "transparent";
      const mapCanvas = container.querySelector("canvas");
      if (mapCanvas instanceof HTMLCanvasElement) {
        mapCanvas.style.background = "transparent";
      }
    }
    unbindRender = bindMapRenderSync(map, paint);
  };

  const paint = () => {
    if (!running || !ctx || !enabled) {
      canvas.style.display = "none";
      return;
    }
    bindMapIfNeeded();

    const rect = wrapper.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    const map = getMap();
    if (!map || !map.isStyleLoaded()) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const globe =
      resolveGlobeScreenBounds(map) ?? resolveGlobeScreenBoundsFallback(width, height);
    if (!shouldRenderGisStarfield(globe, width, height)) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    mapReady = true;
    resize();
    const limb = resolveGlobeLimbBoundsForOverlay(map, wrapper, width, height);
    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, width, height, limb, preset);
  };

  const bootLoop = () => {
    paint();
    if (running && !mapReady) {
      bootFrameId = requestAnimationFrame(bootLoop);
    }
  };

  resize();
  bootLoop();

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          resize();
          paint();
        })
      : null;
  ro?.observe(wrapper);

  return () => {
    running = false;
    cancelAnimationFrame(bootFrameId);
    unbindRender?.();
    ro?.disconnect();
    canvas.remove();
  };
}
