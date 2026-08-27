import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import { resolveGisEffectsSettings } from "@/components/charts/engine/maplibre/gisProjectEffects";
import type { GisEffectsSettings } from "@/components/charts/engine/maplibre/gisProjectEffects";
import type { GisProjectFog } from "@/components/charts/engine/maplibre/gisProject";
import type { GisProjectHalo } from "@/components/charts/engine/maplibre/gisProjectHalo";
import {
  bindMapRenderSync,
  isGlobeTransformProbeReady,
  resolveGlobeLimbBoundsForOverlay,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";
import { readOverlayLayoutSize, syncOverlayCanvasSize } from "@/components/charts/engine/maplibre/gisOverlayCanvas";

type MapLibreMap = import("maplibre-gl").Map;

export type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
export { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

const HALO_CANVAS_CLASS =
  "pointer-events-none absolute inset-0 z-0 h-full w-full";

/**
 * GeoLibre 层栈：光晕 canvas 置于 MapLibre 容器内（z-0），球面 canvas 自然遮挡洗白。
 * @see https://web.geolibre.app/
 */
export function mountGisGlobeHaloOverlay(
  wrapper: HTMLElement,
  getMap: () => MapLibreMap | null,
  getContext: () => {
    preset: GisAtmospherePreset | undefined;
    projection: GisProjection | undefined;
    effects?: GisEffectsSettings;
    halo?: GisProjectHalo;
    fog?: GisProjectFog;
  },
): () => void {
  const enabled = () => getContext().projection === "globe";

  const canvas = document.createElement("canvas");
  canvas.dataset.testid = "gis-globe-halo";
  canvas.className = HALO_CANVAS_CLASS;
  wrapper.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let running = true;
  let unbindRender: (() => void) | undefined;
  let boundMap: MapLibreMap | null = null;
  let bootFrameId = 0;
  let mapReady = false;
  const canvasSize = { width: 0, height: 0 };

  const syncCanvasSize = (width: number, height: number) => {
    syncOverlayCanvasSize(canvas, ctx, width, height, canvasSize);
  };

  /** 光晕与 MapLibre transform 共用同一容器坐标系，避免 shell/map 尺寸源不一致导致偏移。 */
  const resolvePaintOverlay = (): HTMLElement => {
    const map = getMap();
    const mapContainer = map?.getContainer();
    const target = mapContainer ?? wrapper;
    if (canvas.parentElement !== target) {
      if (mapContainer) {
        mapContainer.insertBefore(canvas, mapContainer.firstChild);
      } else {
        wrapper.appendChild(canvas);
      }
    }
    if (mapContainer) {
      mapContainer.style.position = mapContainer.style.position || "relative";
    }
    return target;
  };

  let mapResizeObserver: ResizeObserver | null = null;

  const observeMapContainer = (map: MapLibreMap | null) => {
    mapResizeObserver?.disconnect();
    mapResizeObserver = null;
    if (!map || typeof ResizeObserver === "undefined") return;
    mapResizeObserver = new ResizeObserver(() => {
      paint();
    });
    mapResizeObserver.observe(map.getContainer());
  };

  const bindMapIfNeeded = () => {
    const map = getMap();
    if (map && map === boundMap) return;
    unbindRender?.();
    boundMap = map;
    if (map) {
      observeMapContainer(map);
      const container = map.getContainer();
      container.style.background = "transparent";
      const mapCanvas = container.querySelector(".maplibregl-canvas");
      if (mapCanvas instanceof HTMLCanvasElement) {
        mapCanvas.style.background = "transparent";
      }
    }
    unbindRender = bindMapRenderSync(map, paint);
  };

  const paint = () => {
    if (!running || !ctx || !enabled()) {
      canvas.style.display = "none";
      return;
    }
    bindMapIfNeeded();

    const atmosphereContext = getContext();
    const effects = resolveGisEffectsSettings({
      effects: atmosphereContext.effects,
      halo: atmosphereContext.halo,
      fog: atmosphereContext.fog,
    });

    const overlay = resolvePaintOverlay();
    const { width, height } = readOverlayLayoutSize(overlay);
    if (width <= 0 || height <= 0) return;

    syncCanvasSize(width, height);

    const map = getMap();
    if (!map || !map.isStyleLoaded() || !isGlobeTransformProbeReady(map)) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const limb = resolveGlobeLimbBoundsForOverlay(map, overlay, width, height);
    if (!limb) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    mapReady = true;
    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, width, height, limb, effects);
  };

  const bootLoop = () => {
    paint();
    if (running && !mapReady) {
      bootFrameId = requestAnimationFrame(bootLoop);
    }
  };

  const initial = readOverlayLayoutSize(wrapper);
  syncCanvasSize(initial.width, initial.height);
  bootLoop();

  const wrapperObserver =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          paint();
        })
      : null;
  wrapperObserver?.observe(wrapper);

  return () => {
    running = false;
    cancelAnimationFrame(bootFrameId);
    unbindRender?.();
    wrapperObserver?.disconnect();
    mapResizeObserver?.disconnect();
    canvas.remove();
  };
}
