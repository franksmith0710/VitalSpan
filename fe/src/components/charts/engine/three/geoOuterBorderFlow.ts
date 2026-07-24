import * as THREE from "three";
import type { ResolvedGeoRegionBorderFlow } from "@/components/charts/engine/geo/geoRegionBorderStyle";
import {
  attachBorderLineDistance,
  createGeoBorderFlowMaterial,
  trailLengthToFlowTrailWidth,
} from "@/components/charts/engine/three/geoBorderFlowMaterial";

type Segment2 = { ax: number; ay: number; bx: number; by: number };
type ProjectFn = (coord: [number, number]) => [number, number] | null;

const QUANT_STEP = 0.05;

function quantize(value: number): number {
  return Math.round(value / QUANT_STEP) * QUANT_STEP;
}

function pointKey(x: number, y: number): string {
  return `${quantize(x)},${quantize(y)}`;
}

function segmentKey(seg: Segment2): string {
  const a = pointKey(seg.ax, seg.ay);
  const b = pointKey(seg.bx, seg.by);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function ringToSegments(ring: Array<[number, number]>): Segment2[] {
  if (ring.length < 2) return [];
  const segments: Segment2[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    segments.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
  }
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    segments.push({ ax: last[0], ay: last[1], bx: first[0], by: first[1] });
  }
  return segments;
}

function exteriorRings(geometry: GeoJSON.Geometry): Array<[number, number][]> {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    return ring ? [ring as [number, number][]] : [];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((poly) => poly[0] as [number, number][] | undefined)
      .filter((ring): ring is [number, number][] => Boolean(ring?.length));
  }
  return [];
}

export function collectProjectedExteriorSegments(
  geometry: GeoJSON.Geometry,
  project: ProjectFn,
): Segment2[] {
  const segments: Segment2[] = [];
  for (const ring of exteriorRings(geometry)) {
    const projected: [number, number][] = [];
    for (const coord of ring) {
      const p = project(coord);
      if (p) projected.push(p);
    }
    segments.push(...ringToSegments(projected));
  }
  return segments;
}

/** 仅保留当前层级外轮廓：相邻行政区共享边出现 2 次，外缘只出现 1 次 */
export function pickOuterPerimeterSegments(
  geometries: GeoJSON.Geometry[],
  project: ProjectFn,
): Segment2[] {
  const counts = new Map<string, number>();
  const canonical = new Map<string, Segment2>();

  for (const geometry of geometries) {
    for (const seg of collectProjectedExteriorSegments(geometry, project)) {
      const key = segmentKey(seg);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      canonical.set(key, seg);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count === 1)
    .map(([key]) => canonical.get(key)!);
}

export function buildGeoOuterBorderFlowLines(
  geometries: GeoJSON.Geometry[],
  project: ProjectFn,
  z: number,
  borderColor: number,
  isDark: boolean,
  borderOpacity: number,
  borderFlow: ResolvedGeoRegionBorderFlow,
): THREE.LineSegments | null {
  if (!borderFlow.enabled || geometries.length === 0) return null;

  const outerSegments = pickOuterPerimeterSegments(geometries, project);
  if (outerSegments.length === 0) return null;

  const positions: number[] = [];
  for (const seg of outerSegments) {
    positions.push(seg.ax, seg.ay, z, seg.bx, seg.by, z);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  attachBorderLineDistance(geom);

  const material = createGeoBorderFlowMaterial({
    baseColorHex: borderColor,
    flowColorHex: borderFlow.colorHex,
    opacity: borderOpacity ?? (isDark ? 0.88 : 0.82),
    trailWidth: trailLengthToFlowTrailWidth(borderFlow.trailLength),
  });

  const lines = new THREE.LineSegments(geom, material);
  lines.renderOrder = 26;
  lines.frustumCulled = false;
  lines.userData.outerBorderFlow = true;
  return lines;
}
