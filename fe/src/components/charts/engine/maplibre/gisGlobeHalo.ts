import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import {
  bindMapRenderSync,
  resolveGlobeLimbBoundsFromMap,
  type GlobeLimbBounds,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";

type MapLibreMap = import("maplibre-gl").Map;

export type { GlobeLimbBounds };

export function drawGlobeAtmosphereHalo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  limb: GlobeLimbBounds,
  preset: GisAtmospherePreset | undefined,
) {
  const { x: cx, y: cy, radius: globeRadius } = limb;
  const maxRadius = globeRadius * 2.8;
  const gradient = ctx.createRadialGradient(cx, cy, globeRadius, cx, cy, maxRadius);

  if (preset === "day") {
    gradient.addColorStop(0.0, "rgba(220, 245, 255, 0.95)");
    gradient.addColorStop(0.03, "rgba(170, 220, 255, 0.55)");
    gradient.addColorStop(0.08, "rgba(120, 190, 250, 0.28)");
    gradient.addColorStop(0.18, "rgba(80, 150, 230, 0.12)");
    gradient.addColorStop(0.35, "rgba(50, 110, 200, 0.05)");
    gradient.addColorStop(0.6, "rgba(30, 70, 150, 0.02)");
    gradient.addColorStop(1.0, "rgba(10, 25, 70, 0)");
  } else {
    gradient.addColorStop(0.0, "rgba(200, 235, 255, 1.0)");
    gradient.addColorStop(0.03, "rgba(130, 200, 250, 0.6)");
    gradient.addColorStop(0.08, "rgba(70, 150, 230, 0.35)");
    gradient.addColorStop(0.18, "rgba(40, 100, 200, 0.15)");
    gradient.addColorStop(0.35, "rgba(25, 65, 160, 0.06)");
    gradient.addColorStop(0.6, "rgba(15, 40, 110, 0.02)");
    gradient.addColorStop(1.0, "rgba(10, 25, 70, 0)");
  }

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 1)";
  ctx.beginPath();
  ctx.arc(cx, cy, globeRadius * 0.992, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ensureOverlayHost(map: MapLibreMap): HTMLElement {
  const host = map.getContainer();
  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  return host;
}

export function mountGisGlobeHaloOverlay(
  getMap: () => MapLibreMap | null,
  preset: GisAtmospherePreset | undefined,
  projection: GisProjection | undefined,
): () => void {
  const enabled = projection === "globe";

  let canvas: HTMLCanvasElement | null = null;
  let host: HTMLElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let running = true;
  let unbindRender: (() => void) | undefined;
  let boundMap: MapLibreMap | null = null;
  let frameId = 0;

  const attachCanvas = (map: MapLibreMap) => {
    const nextHost = ensureOverlayHost(map);
    if (host === nextHost && canvas?.parentElement === nextHost) return;

    canvas?.remove();
    host = nextHost;
    canvas = document.createElement("canvas");
    canvas.dataset.testid = "gis-globe-halo";
    canvas.className = "pointer-events-none absolute inset-0 z-[5]";
    host.appendChild(canvas);
    ctx = canvas.getContext("2d");
  };

  const resize = () => {
    if (!canvas || !host || !ctx) return;
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const bindMapIfNeeded = () => {
    const map = getMap();
    if (map === boundMap) return;
    unbindRender?.();
    boundMap = map;
    if (map) attachCanvas(map);
    unbindRender = bindMapRenderSync(map, paint);
  };

  const paint = () => {
    if (!running || !enabled) {
      if (canvas) canvas.style.display = "none";
      return;
    }
    bindMapIfNeeded();

    const map = getMap();
    if (!map || !ctx || !canvas || !host) {
      if (canvas) canvas.style.display = "none";
      return;
    }

    resize();
    const rect = host.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    const limb = resolveGlobeLimbBoundsFromMap(map);
    if (!limb) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      return;
    }

    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, width, height, limb, preset);
  };

  const loop = () => {
    paint();
    frameId = requestAnimationFrame(loop);
  };

  if (enabled) loop();

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          resize();
          paint();
        })
      : null;

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    unbindRender?.();
    ro?.disconnect();
    canvas?.remove();
    canvas = null;
    host = null;
    ctx = null;
  };
}
