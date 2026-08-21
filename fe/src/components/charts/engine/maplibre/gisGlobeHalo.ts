import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import {
  bindMapRenderSync,
  resolveGlobeLimbBoundsForOverlay,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

type MapLibreMap = import("maplibre-gl").Map;

export type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
export { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

/** PMTiles 底图为不透明 canvas：光晕固定 z-5 + 外环 clip，仅随 map render 重绘。 */
export function mountGisGlobeHaloOverlay(
  wrapper: HTMLElement,
  getMap: () => MapLibreMap | null,
  preset: GisAtmospherePreset | undefined,
  projection: GisProjection | undefined,
): () => void {
  const enabled = projection === "globe";

  const canvas = document.createElement("canvas");
  canvas.dataset.testid = "gis-globe-halo";
  canvas.className = "pointer-events-none absolute inset-0 z-[5]";
  wrapper.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let running = true;
  let unbindRender: (() => void) | undefined;
  let boundMap: MapLibreMap | null = null;

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

    if (canvas.parentElement !== wrapper) {
      wrapper.appendChild(canvas);
    }

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

    resize();
    const limb = resolveGlobeLimbBoundsForOverlay(map, wrapper, width, height);
    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, width, height, limb, preset, { clipInnerRing: true });
  };

  resize();
  paint();

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
    unbindRender?.();
    ro?.disconnect();
    canvas.remove();
  };
}
