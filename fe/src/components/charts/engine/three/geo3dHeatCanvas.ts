import * as THREE from "three";
import { geometryToShapes } from "@/components/charts/engine/three/geoToThreeShapes";

  x: number;
  y: number;
  value: number;
};

export type HeatCanvasGradient = Record<number, string>;

/** Demo1 默认色带 */
export const DEFAULT_HEAT_BLOB_GRADIENT: HeatCanvasGradient = {
  0.5: "#1fc2e1",
  0.6: "#24d560",
  0.7: "#9cd522",
  0.8: "#f1e12a",
  0.9: "#ffbf3a",
  1.0: "#ff0000",
};

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bch = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bch})`;
}

function parseRgb(color: string): [number, number, number] {
  const hex = color.trim();
  if (hex.startsWith("#") && hex.length === 7) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return [255, 0, 0];
}

function colorAtIntensity(gradient: HeatCanvasGradient, t: number): string {
  const stops = Object.keys(gradient)
    .map(Number)
    .sort((a, b) => a - b);
  if (stops.length === 0) return "rgb(255,0,0)";
  if (t <= stops[0]) return gradient[stops[0]]!;
  for (let i = 1; i < stops.length; i += 1) {
    const hi = stops[i]!;
    if (t <= hi) {
      const lo = stops[i - 1]!;
      const localT = (t - lo) / (hi - lo);
      return lerpColor(parseRgb(gradient[lo]!), parseRgb(gradient[hi]!), localT);
    }
  }
  return gradient[stops[stops.length - 1]!]!;
}

function drawSplat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grd.addColorStop(0, `rgba(0,0,0,${alpha})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export type BakeHeatCanvasInput = {
  width: number;
  height: number;
  points: HeatCanvasPoint[];
  minValue: number;
  maxValue: number;
  radius: number;
  blur: number;
  gradient?: HeatCanvasGradient;
};

export type BakedHeatCanvas = {
  colorCanvas: HTMLCanvasElement;
  greyCanvas: HTMLCanvasElement;
};

export function bakeHeatCanvas(input: BakeHeatCanvasInput): BakedHeatCanvas {
  const {
    width,
    height,
    points,
    minValue,
    maxValue,
    radius,
    blur,
    gradient = DEFAULT_HEAT_BLOB_GRADIENT,
  } = input;
  const span = maxValue - minValue;
  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const alphaCtx = alphaCanvas.getContext("2d");
  if (!alphaCtx) throw new Error("heat canvas 2d unavailable");

  alphaCtx.clearRect(0, 0, width, height);
  for (const point of points) {
    const t = span <= 0 ? 1 : (point.value - minValue) / span;
    const alpha = 0.25 + t * 0.75;
    drawSplat(alphaCtx, point.x, point.y, radius * blur, alpha);
  }

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext("2d");
  const greyCanvas = document.createElement("canvas");
  greyCanvas.width = width;
  greyCanvas.height = height;
  const greyCtx = greyCanvas.getContext("2d");
  if (!colorCtx || !greyCtx) throw new Error("heat canvas 2d unavailable");

  const image = alphaCtx.getImageData(0, 0, width, height);
  const colorData = colorCtx.createImageData(width, height);
  const greyData = greyCtx.createImageData(width, height);
  for (let i = 0; i < image.data.length; i += 4) {
    const a = image.data[i + 3]! / 255;
    const t = Math.min(1, Math.max(0, a));
    const rgb = parseRgb(colorAtIntensity(gradient, 0.5 + t * 0.5));
    colorData.data[i] = rgb[0];
    colorData.data[i + 1] = rgb[1];
    colorData.data[i + 2] = rgb[2];
    colorData.data[i + 3] = Math.round(a * 255);
    const grey = Math.round(a * 255);
    greyData.data[i] = grey;
    greyData.data[i + 1] = grey;
    greyData.data[i + 2] = grey;
    greyData.data[i + 3] = Math.round(a * 255);
  }
  colorCtx.putImageData(colorData, 0, 0);
  greyCtx.putImageData(greyData, 0, 0);
  return { colorCanvas, greyCanvas };
}

export type ProjBoundsLike = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function projectPointToCanvas(
  x: number,
  y: number,
  bounds: ProjBoundsLike,
  width: number,
  height: number,
  padding = 0,
): { x: number; y: number } {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  return {
    x: padding + ((x - bounds.minX) / spanX) * innerW,
    y: padding + ((bounds.maxY - y) / spanY) * innerH,
  };
}

function fillProjectedShape(
  ctx: CanvasRenderingContext2D,
  shape: THREE.Shape,
  bounds: ProjBoundsLike,
  width: number,
  height: number,
): void {
  const trace = (points: THREE.Vector2[]) => {
    let started = false;
    for (const pt of points) {
      const c = projectPointToCanvas(pt.x, pt.y, bounds, width, height, 0);
      if (!started) {
        ctx.moveTo(c.x, c.y);
        started = true;
      } else {
        ctx.lineTo(c.x, c.y);
      }
    }
    if (started) ctx.closePath();
  };
  ctx.beginPath();
  trace(shape.getPoints());
  for (const hole of shape.holes) trace(hole.getPoints());
  ctx.fill("evenodd");
}

function traceProjectedRing(
  ctx: CanvasRenderingContext2D,
  ring: [number, number][],
  project: (coord: [number, number]) => [number, number] | null,
  bounds: ProjBoundsLike,
  width: number,
  height: number,
): boolean {
  let started = false;
  for (const coord of ring) {
    const p = project(coord);
    if (!p) continue;
    const c = projectPointToCanvas(p[0], p[1], bounds, width, height);
    if (!started) {
      ctx.moveTo(c.x, c.y);
      started = true;
    } else {
      ctx.lineTo(c.x, c.y);
    }
  }
  if (!started) return false;
  ctx.closePath();
  return true;
}

export type BakeRegionHeatInput = {
  width: number;
  height: number;
  features: Array<{ value: number; geometry: GeoJSON.Geometry | null }>;
  project: (coord: [number, number]) => [number, number] | null;
  bounds: ProjBoundsLike;
  minValue: number;
  maxValue: number;
  blur: number;
  gradient?: HeatCanvasGradient;
};

/** 按行政区多边形烘焙贴地热力（与 mesh / projBounds 对齐） */
export function bakeRegionHeatCanvas(input: BakeRegionHeatInput): BakedHeatCanvas {
  const {
    width,
    height,
    features,
    project,
    bounds,
    minValue,
    maxValue,
    blur,
    gradient = DEFAULT_HEAT_BLOB_GRADIENT,
  } = input;
  const span = maxValue - minValue;
  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const alphaCtx = alphaCanvas.getContext("2d");
  if (!alphaCtx) throw new Error("heat canvas 2d unavailable");

  alphaCtx.clearRect(0, 0, width, height);
  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const t = span <= 0 ? 1 : (feature.value - minValue) / span;
    const alpha = 0.2 + t * 0.75;
    alphaCtx.fillStyle = `rgba(0,0,0,${alpha})`;
    const shapes = geometryToShapes(geometry, project);
    for (const shape of shapes) {
      fillProjectedShape(alphaCtx, shape, bounds, width, height);
    }
  }

  if (blur > 0.5) {
    alphaCtx.filter = `blur(${blur * 3}px)`;
    alphaCtx.drawImage(alphaCanvas, 0, 0);
    alphaCtx.filter = "none";
  }

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext("2d");
  const greyCanvas = document.createElement("canvas");
  greyCanvas.width = width;
  greyCanvas.height = height;
  const greyCtx = greyCanvas.getContext("2d");
  if (!colorCtx || !greyCtx) throw new Error("heat canvas 2d unavailable");

  const image = alphaCtx.getImageData(0, 0, width, height);
  const colorData = colorCtx.createImageData(width, height);
  const greyData = greyCtx.createImageData(width, height);
  for (let i = 0; i < image.data.length; i += 4) {
    const a = image.data[i + 3]! / 255;
    const t = Math.min(1, Math.max(0, a));
    const rgb = parseRgb(colorAtIntensity(gradient, 0.45 + t * 0.55));
    colorData.data[i] = rgb[0];
    colorData.data[i + 1] = rgb[1];
    colorData.data[i + 2] = rgb[2];
    colorData.data[i + 3] = Math.round(a * 255);
    const grey = Math.round(a * 255);
    greyData.data[i] = grey;
    greyData.data[i + 1] = grey;
    greyData.data[i + 2] = grey;
    greyData.data[i + 3] = Math.round(a * 255);
  }
  colorCtx.putImageData(colorData, 0, 0);
  greyCtx.putImageData(greyData, 0, 0);
  return { colorCanvas, greyCanvas };
}

export function mapSamplesToCanvasPoints(
  samples: Array<{ x: number; y: number; value: number }>,
  bounds: ProjBoundsLike,
  width: number,
  height: number,
  padding = 24,
): HeatCanvasPoint[] {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  return samples.map((s) => ({
    x: padding + ((s.x - bounds.minX) / spanX) * innerW,
    y: padding + ((bounds.maxY - s.y) / spanY) * innerH,
    value: s.value,
  }));
}
