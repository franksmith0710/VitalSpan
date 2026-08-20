import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import { createMeteorSpawner, drawMeteors, type Meteor } from "@/components/charts/engine/maplibre/gisMeteors";
import {
  bindMapRenderSync,
  resolveGlobeScreenBounds,
  resolveGlobeScreenBoundsFallback,
  resolveGlobeStarMaskRadius,
  shouldRenderGisStarfield,
  type GlobeScreenBounds,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";

type MapLibreMap = import("maplibre-gl").Map;

type Star = {
  u: number;
  v: number;
  radius: number;
  alpha: number;
  twinkle: number;
  phase: number;
};

export function resolveGisStarIntensity(preset: GisAtmospherePreset | undefined): number {
  if (preset === "deep-space") return 1;
  if (preset === "dusk") return 0.45;
  return 0;
}

export function resolveGisMeteorIntensity(preset: GisAtmospherePreset | undefined): number {
  if (preset === "deep-space") return 1;
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
      u: rand(),
      v: rand(),
      radius: roll > 0.992 ? 1.8 : roll > 0.94 ? 1.15 : 0.7,
      alpha: 0.4 + rand() * 0.6,
      twinkle: rand() * 0.4,
      phase: rand() * Math.PI * 2,
    });
  }
  return stars;
}

function rotateAround(
  x: number,
  y: number,
  cx: number,
  cy: number,
  bearingDeg: number,
): { x: number; y: number } {
  const rad = (bearingDeg * Math.PI) / 180;
  const cosB = Math.cos(rad);
  const sinB = Math.sin(rad);
  const ox = x - cx;
  const oy = y - cy;
  return { x: cx + ox * cosB - oy * sinB, y: cy + ox * sinB + oy * cosB };
}

function clipOutsideGlobe(
  ctx: CanvasRenderingContext2D,
  globe: GlobeScreenBounds,
  width: number,
  height: number,
) {
  const maskRadius = resolveGlobeStarMaskRadius(globe, width, height);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.moveTo(globe.x + maskRadius, globe.y);
  ctx.arc(globe.x, globe.y, maskRadius, 0, Math.PI * 2, true);
  ctx.clip("evenodd");
}

function drawStarfieldFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: Star[],
  meteors: Meteor[],
  starIntensity: number,
  meteorIntensity: number,
  timeSec: number,
  globe: GlobeScreenBounds,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  clipOutsideGlobe(ctx, globe, width, height);

  for (const star of stars) {
    const baseX = star.u * width;
    const baseY = star.v * height;
    const { x, y } = rotateAround(baseX, baseY, globe.x, globe.y, globe.bearing);

    const twinkle = star.twinkle * Math.sin(timeSec * 1.6 + star.phase);
    const alpha = Math.min(1, star.alpha * starIntensity * (0.7 + twinkle));
    ctx.fillStyle = `rgba(235, 245, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMeteors(ctx, meteors, meteorIntensity);
  ctx.restore();
}

export function mountGisStarfieldOverlay(
  wrapper: HTMLElement,
  getMap: () => MapLibreMap | null,
  preset: GisAtmospherePreset | undefined,
  projection: GisProjection | undefined,
): () => void {
  const starIntensity = resolveGisStarIntensity(preset);
  const meteorIntensity = resolveGisMeteorIntensity(preset);
  const enabled = projection === "globe" && starIntensity > 0;

  const canvas = document.createElement("canvas");
  canvas.dataset.testid = "gis-starfield";
  canvas.className = "pointer-events-none absolute inset-0 z-[3]";
  wrapper.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const stars = buildStars(starIntensity > 0.7 ? 520 : 360);
  const tickMeteors = createMeteorSpawner(meteorIntensity);
  let meteors: Meteor[] = [];
  let running = true;
  let start = performance.now();
  let lastFrame = start;
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
    unbindRender = bindMapRenderSync(map, paint);
  };

  const paint = () => {
    if (!running || !ctx || !enabled) {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";
    bindMapIfNeeded();

    const rect = wrapper.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    const map = getMap();
    const globe = map
      ? resolveGlobeScreenBounds(map) ?? resolveGlobeScreenBoundsFallback(width, height)
      : resolveGlobeScreenBoundsFallback(width, height);

    if (!shouldRenderGisStarfield(globe, width, height)) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, width, height);
      meteors = [];
      return;
    }

    if (meteorIntensity > 0) {
      meteors = tickMeteors({ width, height, globe, intensity: meteorIntensity }, dt, meteors);
    } else {
      meteors = [];
    }

    drawStarfieldFrame(
      ctx,
      width,
      height,
      stars,
      meteors,
      starIntensity,
      meteorIntensity,
      (now - start) / 1000,
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
