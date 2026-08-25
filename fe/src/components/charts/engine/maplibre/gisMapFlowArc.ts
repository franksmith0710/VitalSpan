/** 全球 OD 飞线弧线：大圆 + 地理贝塞尔拱形（球面视角下向上弯） */

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

function slerpUnit(a: UnitVec, b: UnitVec, t: number): UnitVec {
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
  if (dot > 0.999999) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
  }
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const w0 = Math.sin((1 - t) * omega) / sinOmega;
  const w1 = Math.sin(t * omega) / sinOmega;
  return [a[0] * w0 + b[0] * w1, a[1] * w0 + b[1] * w1, a[2] * w0 + b[2] * w1];
}

function unitToLatLng(x: number, y: number, z: number): [number, number] {
  const len = Math.hypot(x, y, z) || 1;
  return [toDeg(Math.atan2(y, x)), toDeg(Math.asin(clamp(z / len, -1, 1)))];
}

/** 大圆路径插值（平面贴地，供测试/回退） */
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

/**
 * 大圆走向 + 地理二次贝塞尔拱形：中点沿弦线法向抬高，在 Globe 上呈明显向上弯的 OD 飞线。
 * MapLibre 飞线仅有 lng/lat，无法写真实高度；此法为业界常用的 curveness 模拟。
 */
export function interpolateElevatedFlowArc(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = 80,
  lift = DEFAULT_FLOW_ARC_LIFT,
): [number, number][] {
  const dLng = toLng - fromLng;
  const dLat = toLat - fromLat;
  const chordDeg = Math.hypot(dLng, dLat);
  if (chordDeg < 1e-6) {
    return [
      [fromLng, fromLat],
      [toLng, toLat],
    ];
  }

  const curveness = clamp(lift, 0.05, 1.5) * Math.min(chordDeg * 0.52, 32);
  const ctrlLng = (fromLng + toLng) / 2 - (dLat / chordDeg) * curveness;
  const ctrlLat = (fromLat + toLat) / 2 + (dLng / chordDeg) * curveness;

  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const u = 1 - t;
    coords.push([
      u * u * fromLng + 2 * u * t * ctrlLng + t * t * toLng,
      u * u * fromLat + 2 * u * t * ctrlLat + t * t * toLat,
    ]);
  }
  return coords;
}
