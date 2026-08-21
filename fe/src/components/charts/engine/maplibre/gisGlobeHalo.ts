import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import { bindMapRenderSync } from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";
import { resolveGlobeSilhouetteForOverlay } from "@/components/charts/engine/maplibre/gisGlobeSilhouette";

type MapLibreMap = import("maplibre-gl").Map;

export type { GlobeSilhouette } from "@/components/charts/engine/maplibre/gisGlobeSilhouette";
export type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
export { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

/** 光晕固定叠在地图之上（z-5），仅绘制 0.965× 椭球缘外环。 */
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
  let frameId = 0;

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
    if (rect.width <= 0 || rect.height <= 0) return;

    const map = getMap();
    if (!map || !map.isStyleLoaded()) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, rect.width, rect.height);
      return;
    }

    resize();
    const silhouette = resolveGlobeSilhouetteForOverlay(map, wrapper);
    if (!silhouette) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, rect.width, rect.height);
      return;
    }

    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, rect.width, rect.height, silhouette, preset);
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
