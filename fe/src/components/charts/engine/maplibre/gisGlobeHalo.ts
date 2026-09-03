import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import { resolveGisEffectsSettings } from "@/components/charts/engine/maplibre/gisProjectEffects";
import type { GisEffectsSettings } from "@/components/charts/engine/maplibre/gisProjectEffects";
import type { GisProjectFog } from "@/components/charts/engine/maplibre/gisProject";
import type { GisProjectHalo } from "@/components/charts/engine/maplibre/gisProjectHalo";
import {
  bindMapRenderSync,
  resolveGlobeLimbBoundsForHaloPaint,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";
import { applyOverlayCanvasLayout, readMapOverlayPaintSize, readOverlayLayoutSize, syncOverlayCanvasSize } from "@/components/charts/engine/maplibre/gisOverlayCanvas";

type MapLibreMap = import("maplibre-gl").Map;

export type { GlobeLimbBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";
export { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

const HALO_CANVAS_CLASS = "pointer-events-none absolute";
const MAP_CANVAS_Z = "4";
/** 置于 map canvas 之下；球面由 WebGL 自然遮挡，光晕只从球外透明区透出，不洗白地表。 */
const HALO_CANVAS_Z = "3";

/**
 * 可靠光晕层：canvas-container 内 z=3（地图 z=4），全圆 + screen；地图遮挡中心。
 * bindMapRenderSync 跟帧；球缘 resolveGlobeLimbBoundsForHaloPaint。
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
  canvas.style.zIndex = HALO_CANVAS_Z;
  wrapper.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let running = true;
  let unbindRender: (() => void) | undefined;
  let boundMap: MapLibreMap | null = null;
  let bootFrameId = 0;
  const canvasSize = { width: 0, height: 0 };

  const syncCanvasSize = (width: number, height: number) => {
    syncOverlayCanvasSize(canvas, ctx, width, height, canvasSize);
    applyOverlayCanvasLayout(canvas, width, height);
  };

  const resolvePaintOverlay = (): HTMLElement => {
    const map = getMap();
    const paintRoot = map?.getCanvasContainer() ?? map?.getContainer() ?? wrapper;
    const mapCanvas = map?.getCanvas();
    if (canvas.parentElement !== paintRoot) {
      if (mapCanvas?.parentElement === paintRoot) {
        paintRoot.insertBefore(canvas, mapCanvas);
      } else {
        paintRoot.appendChild(canvas);
      }
    } else if (mapCanvas && canvas.nextElementSibling !== mapCanvas) {
      paintRoot.insertBefore(canvas, mapCanvas);
    }
    if (map && mapCanvas) {
      paintRoot.style.position = paintRoot.style.position || "relative";
      mapCanvas.style.zIndex = MAP_CANVAS_Z;
      canvas.style.zIndex = HALO_CANVAS_Z;
    }
    return paintRoot;
  };

  let mapResizeObserver: ResizeObserver | null = null;

  const observeMapContainer = (map: MapLibreMap | null) => {
    mapResizeObserver?.disconnect();
    mapResizeObserver = null;
    if (!map || typeof ResizeObserver === "undefined") return;
    const target = map.getCanvasContainer();
    mapResizeObserver = new ResizeObserver(() => {
      paint();
    });
    mapResizeObserver.observe(target);
  };

  const bindMapIfNeeded = () => {
    const map = getMap();
    if (map && map === boundMap) return;
    unbindRender?.();
    boundMap = map;
    if (map) {
      observeMapContainer(map);
      const container = map.getCanvasContainer();
      container.style.background = "transparent";
      map.getCanvas().style.background = "transparent";
      map.getCanvas().style.zIndex = MAP_CANVAS_Z;
    }
    unbindRender = bindMapRenderSync(map, paint);
  };

  const paint = () => {
    if (!running || !ctx || !enabled()) {
      canvas.style.display = "none";
      return;
    }
    bindMapIfNeeded();

    const overlay = resolvePaintOverlay();
    const map = getMap();
    const { width, height } = readMapOverlayPaintSize(map, overlay);
    if (width <= 0 || height <= 0) return;

    syncCanvasSize(width, height);

    const atmosphereContext = getContext();
    const effects = resolveGisEffectsSettings({
      effects: atmosphereContext.effects,
      halo: atmosphereContext.halo,
      fog: atmosphereContext.fog,
    });
    if (!effects.enabled) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    if (!map || !map.isStyleLoaded()) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const limb = resolveGlobeLimbBoundsForHaloPaint(map, overlay, width, height);
    if (!limb) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, width, height, limb, effects);
  };

  const bootLoop = () => {
    paint();
    if (running) {
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
