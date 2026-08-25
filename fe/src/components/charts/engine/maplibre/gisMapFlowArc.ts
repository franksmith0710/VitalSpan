/** 全球 OD 飞线弧线：大圆 + 径向抬升，在球面视角下形成立体拱形 */

export const DEFAULT_FLOW_ARC_LIFT = 0.42;

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

function normalizeVec(v: UnitVec): UnitVec {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: UnitVec, b: UnitVec): UnitVec {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function unitToLatLng(x: number, y: number, z: number): [number, number] {
  const n = normalizeVec([x, y, z]);
  return [toDeg(Math.atan2(n[1], n[0])), toDeg(Math.asin(clamp(n[2], -1, 1)))];
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

/** 大圆路径插值（平面贴地，供测试/回退） */
export function interpolateGreatCircleArc(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = 48,
): [number, number][] {
  return interpolateElevatedFlowArc(fromLng, fromLat, toLng, toLat, segments, 0);
}

/**
 * 大圆 + 径向抬升：中点沿法线抬高，连线在球面视角呈立体拱形。
 * @param lift 峰值相对抬升（0 = 贴地，0.4 ≈ 明显拱形）
 */
export function interpolateElevatedFlowArc(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = 64,
  lift = DEFAULT_FLOW_ARC_LIFT,
): [number, number][] {
  const v0 = latLngToUnit(fromLng, fromLat);
  const v1 = latLngToUnit(toLng, toLat);
  const dot = clamp(v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2], -1, 1);
  const omega = Math.acos(dot);
  if (!Number.isFinite(omega) || omega < 1e-10) {
    return [
      [fromLng, fromLat],
      [toLng, toLat],
    ];
  }
  const liftScale = lift * Math.min(1, omega / (Math.PI / 2));
  const perp = normalizeVec(cross(v0, v1));
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const base = slerpUnit(v0, v1, t);
    const bulge = liftScale * Math.sin(Math.PI * t);
    coords.push(
      unitToLatLng(
        base[0] + perp[0] * bulge,
        base[1] + perp[1] * bulge,
        base[2] + perp[2] * bulge,
      ),
    );
  }
  return coords;
}
