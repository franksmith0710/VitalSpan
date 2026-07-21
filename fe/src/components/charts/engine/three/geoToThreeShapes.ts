import * as THREE from "three";

export type GeoSurfaceColors = {
  emptyFill: number;
  rangeLow: number;
  rangeHigh: number;
  rangeLowCss: string;
  rangeHighCss: string;
};

export function geoSurfaceColors(isDark: boolean): GeoSurfaceColors {
  return {
    emptyFill: isDark ? 0x334155 : 0xe8edf3,
    rangeLow: isDark ? 0x0c4a6e : 0xe0f2fe,
    rangeHigh: isDark ? 0x38bdf8 : 0x1653a9,
    rangeLowCss: isDark ? "#0c4a6e" : "#e0f2fe",
    rangeHighCss: isDark ? "#38bdf8" : "#1653a9",
  };
}

export function colorForValue(value: number, min: number, max: number, surface: GeoSurfaceColors): number {
  if (!Number.isFinite(value) || value <= 0) return surface.emptyFill;
  if (max <= 0) return surface.emptyFill;
  const t = max <= min ? 1 : (value - min) / (max - min);
  const low = new THREE.Color(surface.rangeLow);
  const high = new THREE.Color(surface.rangeHigh);
  return low.lerp(high, Math.max(0, Math.min(1, t))).getHex();
}

type ProjectFn = (coord: [number, number]) => [number, number] | null;

function traceRing(path: THREE.Path, ring: [number, number][], project: ProjectFn): void {
  let started = false;
  for (const coord of ring) {
    const p = project(coord);
    if (!p) continue;
    if (!started) {
      path.moveTo(p[0], p[1]);
      started = true;
    } else {
      path.lineTo(p[0], p[1]);
    }
  }
}

export function geometryToShapes(geometry: GeoJSON.Geometry, project: ProjectFn): THREE.Shape[] {
  if (geometry.type === "Polygon") {
    const shape = new THREE.Shape();
    geometry.coordinates.forEach((ring, index) => {
      if (index === 0) traceRing(shape, ring as [number, number][], project);
      else {
        const hole = new THREE.Path();
        traceRing(hole, ring as [number, number][], project);
        shape.holes.push(hole);
      }
    });
    return shape.curves.length > 0 ? [shape] : [];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((poly) =>
      geometryToShapes({ type: "Polygon", coordinates: poly }, project),
    );
  }
  return [];
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return Boolean(ctx);
  } catch {
    return false;
  }
}
