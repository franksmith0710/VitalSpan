import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import {
  bindMapRenderSync,
  ensureStarfieldHost,
  resolveGlobeScreenBounds,
  resolveGlobeScreenBoundsFallback,
  type GlobeScreenBounds,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";

type MapLibreMap = import("maplibre-gl").Map;

type Star = {
  ax: number;
  ay: number;
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

/** 星点存于以地球中心为原点的极坐标，绘制时随 bearing 旋转。 */
function buildStars(count: number, seed = 42): Star[] {
  const rand = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    const roll = rand();
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand());
    stars.push({
      ax: Math.cos(angle) * dist,
      ay: Math.sin(angle) * dist,
      radius: roll > 0.985 ? 1.6 : roll > 0.92 ? 1.1 : 0.65,
      alpha: 0.35 + rand() * 0.65,
      twinkle: rand() * 0.35,
      phase: rand() * Math.PI * 2,
    });
  }
  return stars;
}

function starScreenPosition(
  star: Star,
  globe: GlobeScreenBounds,
  width: number,
  height: number,
): { x: number; y: number } {
  const span = Math.max(width, height) * 0.72;
  const bearingRad = (globe.bearing * Math.PI) / 180;
  const cosB = Math.cos(bearingRad);
  const sinB = Math.sin(bearingRad);
  const ox = star.ax * span;
  const oy = star.ay * span;
  const rx = ox * cosB - oy * sinB;
  const ry = ox * sinB + oy * cosB;
  return { x: globe.x + rx, y: globe.y + ry };
}

function punchGlobeMask(ctx: CanvasRenderingContext2D, globe: GlobeScreenBounds) {
  const pitchScale = Math.max(0.35, Math.cos((globe.pitch * Math.PI) / 180));
  ctx.save();
  ctx.translate(globe.x, globe.y);
  ctx.scale(1, pitchScale);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0, 0, globe.radius * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
}

function drawStarfieldFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: Star[],
  intensity: number,
  timeSec: number,
  globe: GlobeScreenBounds,
) {
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    globe.x,
    globe.y,
    globe.radius * 0.1,
    globe.x,
    globe.y,
    Math.max(width, height) * 0.85,
  );
  gradient.addColorStop(0, "rgba(5, 8, 22, 0)");
  gradient.addColorStop(0.45, `rgba(5, 8, 22, ${0.1 * intensity})`);
  gradient.addColorStop(1, `rgba(2, 4, 14, ${0.55 * intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const maskRadius = globe.radius * 0.9;
  for (const star of stars) {
    const { x, y } = starScreenPosition(star, globe, width, height);
    if (Math.hypot(x - globe.x, y - globe.y) < maskRadius) continue;

    const twinkle = star.twinkle * Math.sin(timeSec * 1.4 + star.phase);
    const alpha = Math.min(1, star.alpha * intensity * (0.75 + twinkle));
    ctx.fillStyle = `rgba(230, 240, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  punchGlobeMask(ctx, globe);
}

export function mountGisStarfieldOverlay(
  getMap: () => MapLibreMap | null,
  preset: GisAtmospherePreset | undefined,
  projection: GisProjection | undefined,
): () => void {
  const intensity = resolveGisStarIntensity(preset);
  const enabled = projection === "globe" && intensity > 0;

  let canvas: HTMLCanvasElement | null = null;
  let host: HTMLElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let running = true;
  let start = performance.now();
  let unbindRender: (() => void) | undefined;
  let boundMap: MapLibreMap | null = null;
  const stars = buildStars(420);

  const detachCanvas = () => {
    unbindRender?.();
    unbindRender = undefined;
    boundMap = null;
    canvas?.remove();
    canvas = null;
    ctx = null;
    host = null;
  };

  const resize = () => {
    const map = getMap();
    if (!map || !canvas || !host) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const ensureMounted = () => {
    const map = getMap();
    if (!map || !enabled) {
      detachCanvas();
      return;
    }
    if (boundMap === map && canvas) return;

    detachCanvas();
    boundMap = map;
    host = ensureStarfieldHost(map);
    canvas = document.createElement("canvas");
    canvas.dataset.testid = "gis-starfield";
    canvas.className = "pointer-events-none absolute inset-0";
    canvas.style.zIndex = "2";
    host.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    unbindRender = bindMapRenderSync(map, paint);
  };

  const paint = () => {
    if (!running || !enabled) {
      detachCanvas();
      return;
    }
    ensureMounted();
    if (!ctx || !canvas || !host) return;

    const map = getMap();
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!map || width <= 0 || height <= 0) return;

    const globe = resolveGlobeScreenBounds(map) ?? resolveGlobeScreenBoundsFallback(width, height);
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

  if (enabled) loop();

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          resize();
          paint();
        })
      : null;
  const map = getMap();
  if (map) ro?.observe(ensureStarfieldHost(map));

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    ro?.disconnect();
    detachCanvas();
  };
}
