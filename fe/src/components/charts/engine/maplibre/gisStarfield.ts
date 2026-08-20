import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import { bindMapRenderSync, resolveGlobeScreenBounds } from "@/components/charts/engine/maplibre/gisGlobeLayout";

type MapLibreMap = import("maplibre-gl").Map;

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkle: number;
  phase: number;
};

export function resolveGisStarIntensity(preset: GisAtmospherePreset | undefined): number {
  if (preset === "deep-space") return 0.9;
  if (preset === "dusk") return 0.35;
  return 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars(count: number, seed = 42): Star[] {
  const rand = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    const roll = rand();
    stars.push({
      x: rand(),
      y: rand(),
      radius: roll > 0.985 ? 1.6 : roll > 0.92 ? 1.1 : 0.65,
      alpha: 0.35 + rand() * 0.65,
      twinkle: rand() * 0.35,
      phase: rand() * Math.PI * 2,
    });
  }
  return stars;
}

function drawStarfieldFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: Star[],
  intensity: number,
  timeSec: number,
  globe: { x: number; y: number; radius: number },
) {
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    globe.x,
    globe.y,
    globe.radius * 0.15,
    globe.x,
    globe.y,
    Math.max(width, height) * 0.8,
  );
  gradient.addColorStop(0, "rgba(5, 8, 22, 0)");
  gradient.addColorStop(0.5, `rgba(5, 8, 22, ${0.12 * intensity})`);
  gradient.addColorStop(1, `rgba(2, 4, 14, ${0.5 * intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const maskRadius = globe.radius * 0.9;
  for (const star of stars) {
    const sx = star.x * width;
    const sy = star.y * height;
    if (Math.hypot(sx - globe.x, sy - globe.y) < maskRadius) continue;

    const twinkle = star.twinkle * Math.sin(timeSec * 1.4 + star.phase);
    const alpha = Math.min(1, star.alpha * intensity * (0.75 + twinkle));
    ctx.fillStyle = `rgba(230, 240, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(globe.x, globe.y, maskRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

export function mountGisStarfieldOverlay(
  wrapper: HTMLElement,
  getMap: () => MapLibreMap | null,
  preset: GisAtmospherePreset | undefined,
  projection: GisProjection | undefined,
): () => void {
  const canvas = document.createElement("canvas");
  canvas.dataset.testid = "gis-starfield";
  canvas.className = "pointer-events-none absolute inset-0 z-[2]";
  wrapper.appendChild(canvas);

  const stars = buildStars(420);
  const ctx = canvas.getContext("2d");
  let running = true;
  let start = performance.now();
  let unbindRender: (() => void) | undefined;
  let boundMap: MapLibreMap | null = null;

  const intensity = resolveGisStarIntensity(preset);
  const enabled = projection === "globe" && intensity > 0;

  const resize = () => {
    const rect = wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
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
    canvas.style.display = "block";

    const rect = wrapper.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    const globe = resolveGlobeScreenBounds(getMap(), width, height);
    drawStarfieldFrame(
      ctx,
      width,
      height,
      stars,
      intensity,
      (performance.now() - start) / 1000,
      globe,
    );
  };

  let frameId = 0;
  const loop = () => {
    paint();
    frameId = requestAnimationFrame(loop);
  };

  resize();
  if (enabled) loop();

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro?.observe(wrapper);

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    unbindRender?.();
    ro?.disconnect();
    canvas.remove();
  };
}
