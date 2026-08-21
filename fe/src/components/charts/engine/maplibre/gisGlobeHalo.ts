import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import {
  bindMapRenderSync,
  resolveGlobeLimbBoundsForOverlay,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

type MapLibreMap = import("maplibre-gl").Map;

export type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
export { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

function applyHaloStackMode(canvas: HTMLCanvasElement, aboveMap: boolean) {
  canvas.className = aboveMap
    ? "pointer-events-none absolute inset-0 z-[5]"
    : "pointer-events-none absolute inset-0 z-[3]";
}

function haloNeedsTopLayer(map: MapLibreMap): boolean {
  const mapCanvas = map.getContainer().querySelector("canvas.maplibregl-canvas") as HTMLCanvasElement | null;
  if (!mapCanvas) return false;
  const bg = getComputedStyle(mapCanvas).backgroundColor;
  return bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";
}

/** GeoLibre 图层：z-3 光晕 → z-4 地图；不透明底图时自动改 z-5 仅外环。 */
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
  let frameId = 0;
  let clipInnerRing = false;

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
    if (map === boundMap) return;
    unbindRender?.();
    boundMap = map;
    if (map) {
      map.getContainer().style.background = "transparent";
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

    const aboveMap = haloNeedsTopLayer(map);
    clipInnerRing = aboveMap;
    applyHaloStackMode(canvas, aboveMap);
    if (aboveMap && canvas.parentElement !== wrapper) {
      wrapper.appendChild(canvas);
    }

    resize();
    const limb = resolveGlobeLimbBoundsForOverlay(map, wrapper);
    if (!limb) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, width, height, limb, preset, { clipInnerRing });
  };

  const loop = () => {
    paint();
    frameId = requestAnimationFrame(loop);
  };

  resize();
  if (enabled) loop();

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
    cancelAnimationFrame(frameId);
    unbindRender?.();
    ro?.disconnect();
    canvas.remove();
  };
}
