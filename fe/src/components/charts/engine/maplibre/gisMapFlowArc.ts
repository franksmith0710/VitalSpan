/** 全球 OD 飞线弧线：大圆路径 + 球面法向 sin 拱起（ECharts lines.curveness / deck.gl ArcLayer 同类） */

import { DEFAULT_FLOW_ARC_LIFT } from "@/components/charts/engine/maplibre/gisFlowDefaults";

export { DEFAULT_FLOW_ARC_LIFT } from "@/components/charts/engine/maplibre/gisFlowDefaults";

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function toDeg(value: number): number {
  return (value * 180) / Math.PI;
}

type UnitVec = [number, number, number];

function latLngToUnit(lng: number, lat: number): UnitVec {
  const latR = toRad(lat);
  const lngR = toRad(lng);
  const cosLat = Math.cos(latR);
  return [cosLat * Math.cos(lngR), cosLat * Math.sin(lngR), Math.sin(latR)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(v: UnitVec): UnitVec {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: UnitVec, b: UnitVec): UnitVec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function slerpUnit(a: UnitVec, b: UnitVec, t: number): UnitVec {
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
  if (dot > 0.999999) {
    return normalize([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]);
  }
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const w0 = Math.sin((1 - t) * omega) / sinOmega;
  const w1 = Math.sin(t * omega) / sinOmega;
  return normalize([a[0] * w0 + b[0] * w1, a[1] * w0 + b[1] * w1, a[2] * w0 + b[2] * w1]);
}

function unitToLatLng(x: number, y: number, z: number): [number, number] {
  return [toDeg(Math.atan2(y, x)), toDeg(Math.asin(clamp(z, -1, 1)))];
}

/** 大圆路径插值（贴地基准线） */
export function interpolateGreatCircleArc(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = 48,
): [number, number][] {
  const v0 = latLngToUnit(fromLng, fromLat);
  const v1 = latLngToUnit(toLng, toLat);
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const base = slerpUnit(v0, v1, t);
    coords.push(unitToLatLng(base[0], base[1], base[2]));
  }
  return coords;
}

function greatCircleBulgeDirection(normal: UnitVec, base: UnitVec): UnitVec {
  const binormal = normalize(cross(normal, base));
  if (binormal[2] < 0) {
    return [-binormal[0], -binormal[1], -binormal[2]];
  }
  return binormal;
}

/**
 * 沿大圆 slerp，再沿球面法向（大圆平面法线 × 径向）做 sin(πt) 抬高。
 * MapLibre 仅有 lng/lat，此法与 ECharts `lines.curveness` / deck.gl `getTilt` 同类。
 */
export function interpolateElevatedFlowArc(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = 80,
  lift = DEFAULT_FLOW_ARC_LIFT,
): [number, number][] {
  const v0 = latLngToUnit(fromLng, fromLat);
  const v1 = latLngToUnit(toLng, toLat);
  const normal = cross(v0, v1);
  const normalLen = Math.hypot(normal[0], normal[1], normal[2]);
  if (normalLen < 1e-8) {
    return interpolateGreatCircleArc(fromLng, fromLat, toLng, toLat, segments);
  }
  const greatNormal = normalize(normal);
  const dot = clamp(v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2], -1, 1);
  const omega = Math.acos(dot);
  const peakBulge = clamp(lift, 0.05, 1.5) * Math.min(omega * 0.38, 0.42);

  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const base = slerpUnit(v0, v1, t);
    const bulgeDir = greatCircleBulgeDirection(greatNormal, base);
    const amount = Math.sin(Math.PI * t) * peakBulge;
    const lifted = normalize([
      base[0] + bulgeDir[0] * amount,
      base[1] + bulgeDir[1] * amount,
      base[2] + bulgeDir[2] * amount,
    ]);
    coords.push(unitToLatLng(lifted[0], lifted[1], lifted[2]));
  }
  return coords;
}
