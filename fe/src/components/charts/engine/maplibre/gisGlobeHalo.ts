import type { GisAtmospherePreset, GisProjection } from "@/components/charts/engine/maplibre/gisProject";
import { bindMapRenderSync, resolveGlobeScreenBoundsFallback } from "@/components/charts/engine/maplibre/gisGlobeLayout";

type MapLibreMap = import("maplibre-gl").Map;

export type GlobeLimbBounds = {
  x: number;
  y: number;
  radius: number;
};

/** 沿地轴采样 16 个边缘点，pitch 下仍对齐（GeoLibre / Leonel Dias 方案）。 */
export function resolveGlobeLimbBounds(
  map: MapLibreMap,
  width: number,
  height: number,
): GlobeLimbBounds | null {
  const center = map.getCenter();
  const clng = (center.lng * Math.PI) / 180;
  const clat = (center.lat * Math.PI) / 180;
  const points: { x: number; y: number }[] = [];
  const numSamples = 16;

  for (let i = 0; i < numSamples; i += 1) {
    const bearing = (i / numSamples) * 2 * Math.PI;
    const edgeLat = Math.asin(
      Math.sin(clat) * Math.cos(Math.PI / 2) +
        Math.cos(clat) * Math.sin(Math.PI / 2) * Math.cos(bearing),
    );
    const edgeLng =
      clng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(Math.PI / 2) * Math.cos(clat),
        Math.cos(Math.PI / 2) - Math.sin(clat) * Math.sin(edgeLat),
      );
    const px = map.project([(edgeLng * 180) / Math.PI, (edgeLat * 180) / Math.PI]);
    if (Number.isFinite(px.x) && Number.isFinite(px.y)) {
      points.push(px);
    }
  }

  if (points.length < 3) {
    const fallback = resolveGlobeScreenBoundsFallback(width, height);
    return { x: fallback.x, y: fallback.y, radius: fallback.radius };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    radius: Math.max(maxX - minX, maxY - minY) / 2,
  };
}

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
  // 光晕叠在地图之上时，挖掉球内区域，只保留外缘大气层。
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 1)";
  ctx.beginPath();
  ctx.arc(cx, cy, globeRadius * 0.985, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

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
    const fallback = resolveGlobeScreenBoundsFallback(width, height);
    const limb = map
      ? resolveGlobeLimbBounds(map, width, height) ?? {
          x: fallback.x,
          y: fallback.y,
          radius: fallback.radius,
        }
      : { x: fallback.x, y: fallback.y, radius: fallback.radius };

    canvas.style.display = "block";
    drawGlobeAtmosphereHalo(ctx, width, height, limb, preset);
  };

  resize();
  paint();

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
    resize();
    paint();
  }) : null;
  ro?.observe(wrapper);

  return () => {
    running = false;
    unbindRender?.();
    ro?.disconnect();
    canvas.remove();
  };
}
