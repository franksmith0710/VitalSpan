import * as THREE from "three";
import type { ResolvedGeoRegionBorderFlow } from "@/components/charts/engine/geo/geoRegionBorderStyle";
import {
  attachBorderLineDistance,
  createGeoBorderFlowMaterial,
  trailLengthToFlowTrailWidth,
} from "@/components/charts/engine/three/geoBorderFlowMaterial";
import {
  createGeoBorderFlowParticles,
  type GeoBorderFlowParticleSystem,
} from "@/components/charts/engine/three/geoBorderFlowParticles";

export type GeoOuterBorderFlowBundle = {
  group: THREE.Group;
  lines: THREE.LineSegments;
  particles: GeoBorderFlowParticleSystem;
};

type Segment2 = { ax: number; ay: number; bx: number; by: number };
type ProjectFn = (coord: [number, number]) => [number, number] | null;

type BorderEdge = { segKey: string; seg: Segment2; aKey: string; bKey: string };

const QUANT_STEP = 0.05;
/** 串联外轮廓时略粗于 QUANT_STEP，弥合省界投影缝隙 */
const ADJ_SNAP = 0.1;

function quantize(value: number): number {
  return Math.round(value / QUANT_STEP) * QUANT_STEP;
}

function pointKey(x: number, y: number): string {
  return `${quantize(x)},${quantize(y)}`;
}

function adjPointKey(x: number, y: number): string {
  return `${Math.round(x / ADJ_SNAP) * ADJ_SNAP},${Math.round(y / ADJ_SNAP) * ADJ_SNAP}`;
}

function parsePointKey(key: string): [number, number] {
  const [x, y] = key.split(",").map(Number);
  return [x!, y!];
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

function segmentLength(seg: Segment2): number {
  return Math.hypot(seg.bx - seg.ax, seg.by - seg.ay);
}

function ringPerimeter(ring: Segment2[]): number {
  return ring.reduce((sum, seg) => sum + segmentLength(seg), 0);
}

function ringVertices(ring: Segment2[]): [number, number][] {
  if (ring.length === 0) return [];
  const verts: [number, number][] = [[ring[0]!.ax, ring[0]!.ay]];
  for (const seg of ring) verts.push([seg.bx, seg.by]);
  return verts;
}

/** 鞋带公式；取绝对值作为陆地包围面积 */
export function ringAbsArea(ring: Segment2[]): number {
  const verts = ringVertices(ring);
  if (verts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < verts.length - 1; i++) {
    const [x1, y1] = verts[i]!;
    const [x2, y2] = verts[i + 1]!;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) * 0.5;
}

function buildAdjacency(segments: Segment2[]): Map<string, BorderEdge[]> {
  const adj = new Map<string, BorderEdge[]>();
  for (const seg of segments) {
    const segKey = segmentKey(seg);
    const aKey = adjPointKey(seg.ax, seg.ay);
    const bKey = adjPointKey(seg.bx, seg.by);
    const edge: BorderEdge = { segKey, seg, aKey, bKey };
    const aList = adj.get(aKey);
    if (aList) aList.push(edge);
    else adj.set(aKey, [edge]);
    const bList = adj.get(bKey);
    if (bList) bList.push(edge);
    else adj.set(bKey, [edge]);
  }
  return adj;
}

/** 外轮廓行走：在结点处取最小逆时针转角，保证贴外缘单圈闭合 */
function pickNextOuterEdge(
  prevX: number,
  prevY: number,
  curX: number,
  curY: number,
  curKey: string,
  candidates: BorderEdge[],
): BorderEdge | undefined {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const inAngle = Math.atan2(curY - prevY, curX - prevX);
  let best: BorderEdge | undefined;
  let bestDelta = Infinity;

  for (const edge of candidates) {
    const [ox, oy] =
      edge.aKey === curKey ? parsePointKey(edge.bKey) : parsePointKey(edge.aKey);
    const outAngle = Math.atan2(oy - curY, ox - curX);
    let delta = outAngle - inAngle;
    while (delta <= 1e-6) delta += Math.PI * 2;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = edge;
    }
  }

  return best;
}

function orientEdgeFrom(edge: BorderEdge, fromKey: string): Segment2 {
  return adjPointKey(edge.seg.ax, edge.seg.ay) === fromKey
    ? { ax: edge.seg.ax, ay: edge.seg.ay, bx: edge.seg.bx, by: edge.seg.by }
    : { ax: edge.seg.bx, ay: edge.seg.by, bx: edge.seg.ax, by: edge.seg.ay };
}

function otherVertexKey(edge: BorderEdge, fromKey: string): string {
  return edge.aKey === fromKey ? edge.bKey : edge.aKey;
}

function findStartEdge(
  adj: Map<string, BorderEdge[]>,
  used: Set<string>,
): { edge: BorderEdge; startKey: string } | null {
  let startKey: string | null = null;
  let startY = Infinity;
  let startX = Infinity;
  let startEdge: BorderEdge | undefined;

  for (const key of adj.keys()) {
    const candidates = (adj.get(key) ?? []).filter((edge) => !used.has(edge.segKey));
    if (candidates.length === 0) continue;

    const [x, y] = parsePointKey(key);
    if (y < startY - 1e-6 || (Math.abs(y - startY) < 1e-6 && x < startX)) {
      startY = y;
      startX = x;
      startKey = key;

      let best: BorderEdge | undefined;
      let bestAngle = Infinity;
      for (const edge of candidates) {
        const [ox, oy] =
          edge.aKey === key ? parsePointKey(edge.bKey) : parsePointKey(edge.aKey);
        const angle = Math.atan2(oy - y, ox - x);
        const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
        if (normalized < bestAngle) {
          bestAngle = normalized;
          best = edge;
        }
      }
      startEdge = best ?? candidates[0];
    }
  }

  if (!startKey || !startEdge) return null;
  return { edge: startEdge, startKey };
}

function walkOuterRing(
  startEdge: BorderEdge,
  startKey: string,
  adj: Map<string, BorderEdge[]>,
  used: Set<string>,
  segmentBudget: number,
): Segment2[] | null {
  const ring: Segment2[] = [];
  const [startX, startY] = parsePointKey(startKey);

  used.add(startEdge.segKey);
  let oriented = orientEdgeFrom(startEdge, startKey);
  ring.push(oriented);

  let prevX = startX - (oriented.bx - oriented.ax);
  let prevY = startY - (oriented.by - oriented.ay);
  let curKey = adjPointKey(oriented.bx, oriented.by);
  let guard = 0;

  while (curKey !== startKey && guard < segmentBudget + 2) {
    guard += 1;
    const [curX, curY] = parsePointKey(curKey);
    const candidates = (adj.get(curKey) ?? []).filter((edge) => !used.has(edge.segKey));
    const edge = pickNextOuterEdge(prevX, prevY, curX, curY, curKey, candidates);
    if (!edge) return null;

    used.add(edge.segKey);
    oriented = orientEdgeFrom(edge, curKey);
    ring.push(oriented);
    prevX = curX;
    prevY = curY;
    curKey = otherVertexKey(edge, curKey);
  }

  return curKey === startKey && ring.length > 0 ? ring : null;
}

/** 将无序外缘边段串联为闭合环（每岛/外轮廓一条） */
export function chainSegmentsIntoRings(segments: Segment2[]): Segment2[][] {
  if (segments.length === 0) return [];

  const adj = buildAdjacency(segments);
  const used = new Set<string>();
  const rings: Segment2[][] = [];

  while (used.size < segments.length) {
    const start = findStartEdge(adj, used);
    if (!start) break;

    const ring = walkOuterRing(start.edge, start.startKey, adj, used, segments.length);
    if (ring) rings.push(ring);
    else used.add(start.edge.segKey);
  }

  return rings;
}

/** 多岛时取包围面积最大的外轮廓（大陆主体），保证流光绕最大陆块闭环 */
export function pickLargestAreaRing(segments: Segment2[]): Segment2[] {
  const rings = chainSegmentsIntoRings(segments);
  if (rings.length === 0) return [];
  return rings.reduce((best, ring) => (ringAbsArea(ring) > ringAbsArea(best) ? ring : best));
}

/** @deprecated 使用 pickLargestAreaRing（按面积而非周长） */
export function pickLongestRing(segments: Segment2[]): Segment2[] {
  return pickLargestAreaRing(segments);
}

export function buildGeoOuterBorderFlowLines(
  geometries: GeoJSON.Geometry[],
  project: ProjectFn,
  z: number,
  borderColor: number,
  isDark: boolean,
  borderOpacity: number,
  borderFlow: ResolvedGeoRegionBorderFlow,
): GeoOuterBorderFlowBundle | null {
  if (!borderFlow.enabled || geometries.length === 0) return null;

  const outerSegments = pickOuterPerimeterSegments(geometries, project);
  const orderedRing = pickLargestAreaRing(outerSegments);
  if (orderedRing.length === 0) return null;

  const positions: number[] = [];
  for (const seg of orderedRing) {
    positions.push(seg.ax, seg.ay, z, seg.bx, seg.by, z);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  attachBorderLineDistance(geom);

  const flowOpacity = borderOpacity ?? (isDark ? 0.88 : 0.82);
  const material = createGeoBorderFlowMaterial({
    baseColorHex: borderColor,
    flowColorHex: borderFlow.colorHex,
    opacity: flowOpacity,
    trailWidth: trailLengthToFlowTrailWidth(borderFlow.trailLength),
  });

  const lines = new THREE.LineSegments(geom, material);
  lines.renderOrder = 26;
  lines.frustumCulled = false;

  const particles = createGeoBorderFlowParticles(
    orderedRing,
    z + 0.03,
    borderFlow.colorHex,
    flowOpacity,
    borderFlow.trailLength,
  );

  const group = new THREE.Group();
  group.userData.outerBorderFlow = true;
  group.add(lines);
  group.add(particles.points);

  return { group, lines, particles };
}
