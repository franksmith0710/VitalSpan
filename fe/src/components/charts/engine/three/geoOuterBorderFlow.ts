import * as THREE from "three";
import { prepareOfflineGeoGeometry } from "@/components/charts/engine/geo/geoProjection";
import type { ResolvedGeoRegionBorderFlow } from "@/components/charts/engine/geo/geoRegionBorderStyle";
import {
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

function quantize(value: number): number {
  return Math.round(value / QUANT_STEP) * QUANT_STEP;
}

function pointKey(x: number, y: number): string {
  return `${quantize(x)},${quantize(y)}`;
}

function parsePointKey(key: string): [number, number] {
  const [x, y] = key.split(",").map(Number);
  return [x!, y!];
}

/** 按当前地图尺度自适应端点吸附半径，弥合省界/投影缝隙 */
export function resolveAdjSnap(segments: Segment2[]): number {
  if (segments.length === 0) return 0.5;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const seg of segments) {
    for (const [x, y] of [
      [seg.ax, seg.ay],
      [seg.bx, seg.by],
    ] as const) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const span = Math.max(maxX - minX, maxY - minY);
  return Math.max(0.3, Math.min(5, span / 120));
}

type EndpointGrouper = (x: number, y: number) => string;

/** 空间哈希聚类：距离 < snap 的端点归为同一结点 */
export function createEndpointGrouper(snap: number): EndpointGrouper {
  const clusters: Array<{ x: number; y: number }> = [];
  const grid = new Map<string, number[]>();
  const cell = Math.max(snap, 0.1);

  return (x: number, y: number): string => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = grid.get(`${cx + dx},${cy + dy}`);
        if (!bucket) continue;
        for (const idx of bucket) {
          const c = clusters[idx]!;
          if (Math.hypot(c.x - x, c.y - y) <= snap) {
            return `${c.x.toFixed(4)},${c.y.toFixed(4)}`;
          }
        }
      }
    }
    const idx = clusters.length;
    clusters.push({ x, y });
    const key = `${cx},${cy}`;
    const list = grid.get(key);
    if (list) list.push(idx);
    else grid.set(key, [idx]);
    return `${x.toFixed(4)},${y.toFixed(4)}`;
  };
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
  const normalized = prepareOfflineGeoGeometry(geometry);
  const segments: Segment2[] = [];
  for (const ring of exteriorRings(normalized)) {
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

export function ringBBoxArea(ring: Segment2[]): number {
  const verts = ringVertices(ring);
  if (verts.length < 2) return 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of verts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function componentBBoxArea(segments: Segment2[]): number {
  if (segments.length === 0) return 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const seg of segments) {
    for (const [x, y] of [
      [seg.ax, seg.ay],
      [seg.bx, seg.by],
    ] as const) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function segmentEndpointKey(seg: Segment2, grouper: EndpointGrouper): [string, string] {
  return [grouper(seg.ax, seg.ay), grouper(seg.bx, seg.by)];
}

/** 外缘边按端点连通性分组（大陆主体 vs 台湾/海南等离岛） */
export function segmentComponents(segments: Segment2[]): Segment2[][] {
  if (segments.length === 0) return [];

  const snap = resolveAdjSnap(segments);
  const grouper = createEndpointGrouper(snap);
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const parentKey = parent.get(key);
    if (!parentKey || parentKey === key) return key;
    const root = find(parentKey);
    parent.set(key, root);
    return root;
  };
  const unite = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  for (const seg of segments) {
    const [aKey, bKey] = segmentEndpointKey(seg, grouper);
    if (!parent.has(aKey)) parent.set(aKey, aKey);
    if (!parent.has(bKey)) parent.set(bKey, bKey);
    unite(aKey, bKey);
  }

  const groups = new Map<string, Segment2[]>();
  for (const seg of segments) {
    const [aKey] = segmentEndpointKey(seg, grouper);
    const root = find(aKey);
    const list = groups.get(root);
    if (list) list.push(seg);
    else groups.set(root, [seg]);
  }

  return [...groups.values()];
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

type HalfEdge = {
  seg: Segment2;
  from: string;
  to: string;
  angle: number;
  twin: HalfEdge;
  next?: HalfEdge;
  visited?: boolean;
};

function coordOfKey(key: string): [number, number] {
  return parsePointKey(key);
}

/** 半边平面面追踪：在复杂省界/海岸线上稳定串联闭合外轮廓 */
function traceFacesWithHalfEdges(segments: Segment2[]): Segment2[][] {
  if (segments.length === 0) return [];

  const snap = resolveAdjSnap(segments);
  const grouper = createEndpointGrouper(snap);
  const halfEdges: HalfEdge[] = [];

  for (const seg of segments) {
    const a = grouper(seg.ax, seg.ay);
    const b = grouper(seg.bx, seg.by);
    const ab: HalfEdge = {
      seg,
      from: a,
      to: b,
      angle: Math.atan2(seg.by - seg.ay, seg.bx - seg.ax),
      twin: null as unknown as HalfEdge,
    };
    const ba: HalfEdge = {
      seg,
      from: b,
      to: a,
      angle: Math.atan2(seg.ay - seg.by, seg.ax - seg.bx),
      twin: ab,
    };
    ab.twin = ba;
    halfEdges.push(ab, ba);
  }

  const outgoing = new Map<string, HalfEdge[]>();
  for (const he of halfEdges) {
    const list = outgoing.get(he.from);
    if (list) list.push(he);
    else outgoing.set(he.from, [he]);
  }

  for (const list of outgoing.values()) {
    list.sort((a, b) => a.angle - b.angle);
  }

  for (const he of halfEdges) {
    const leave = outgoing.get(he.to);
    if (!leave?.length) continue;
    const idx = leave.indexOf(he.twin);
    if (idx === -1) continue;
    he.next = leave[(idx + 1) % leave.length]!;
  }

  const faces: Segment2[][] = [];
  const maxSteps = segments.length + 4;
  for (const start of halfEdges) {
    if (start.visited) continue;
    const ring: Segment2[] = [];
    let cur: HalfEdge | undefined = start;
    let guard = 0;
    while (cur && !cur.visited && guard < maxSteps) {
      cur.visited = true;
      const [ax, ay] = coordOfKey(cur.from);
      const [bx, by] = coordOfKey(cur.to);
      ring.push({ ax, ay, bx, by });
      cur = cur.next;
      guard += 1;
      if (cur === start) break;
    }
    if (ring.length >= 3 && cur === start) faces.push(ring);
  }

  return faces;
}

function pickLargestFaceRing(segments: Segment2[]): Segment2[] {
  const faces = traceFacesWithHalfEdges(segments);
  if (faces.length > 0) {
    return faces.reduce((best, ring) => (ringAbsArea(ring) > ringAbsArea(best) ? ring : best));
  }
  const rings = chainSegmentsIntoRings(segments);
  if (rings.length === 0) return [];
  return rings.reduce((best, ring) => (ringPerimeter(ring) > ringPerimeter(best) ? ring : best));
}

function buildAdjacency(segments: Segment2[], grouper: EndpointGrouper): Map<string, BorderEdge[]> {
  const adj = new Map<string, BorderEdge[]>();
  for (const seg of segments) {
    const segKey = segmentKey(seg);
    const aKey = grouper(seg.ax, seg.ay);
    const bKey = grouper(seg.bx, seg.by);
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

/** 外轮廓行走：在结点处取最大逆时针转角（海域在左侧，贴外缘单圈闭合） */
function pickNextExteriorEdge(
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
  let bestDelta = -Infinity;

  for (const edge of candidates) {
    const [ox, oy] =
      edge.aKey === curKey ? parsePointKey(edge.bKey) : parsePointKey(edge.aKey);
    const outAngle = Math.atan2(oy - curY, ox - curX);
    let delta = outAngle - inAngle;
    while (delta <= 1e-6) delta += Math.PI * 2;
    if (delta > bestDelta) {
      bestDelta = delta;
      best = edge;
    }
  }

  return best;
}

/** 外轮廓行走：在结点处取最小逆时针转角，保证贴内缘单圈闭合 */
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
  return edge.aKey === fromKey
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
  let curKey = startEdge.bKey === startKey ? startEdge.aKey : startEdge.bKey;
  if (curKey === startKey) curKey = startEdge.aKey === startKey ? startEdge.bKey : startEdge.aKey;
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

/** 将无序外缘边段串联为闭合环（每岛/内轮廓一条） */
export function chainSegmentsIntoRings(segments: Segment2[]): Segment2[][] {
  if (segments.length === 0) return [];

  const snap = resolveAdjSnap(segments);
  const grouper = createEndpointGrouper(snap);
  const adj = buildAdjacency(segments, grouper);
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

function walkExteriorRing(
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
  let curKey = startEdge.bKey === startKey ? startEdge.aKey : startEdge.bKey;
  if (curKey === startKey) curKey = startEdge.aKey === startKey ? startEdge.bKey : startEdge.aKey;
  let guard = 0;

  while (curKey !== startKey && guard < segmentBudget + 2) {
    guard += 1;
    const [curX, curY] = parsePointKey(curKey);
    const candidates = (adj.get(curKey) ?? []).filter((edge) => !used.has(edge.segKey));
    const edge = pickNextExteriorEdge(prevX, prevY, curX, curY, curKey, candidates);
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

/** 沿外缘（海域侧）串联闭合环 */
function traceExteriorRings(segments: Segment2[]): Segment2[][] {
  if (segments.length === 0) return [];

  const snap = resolveAdjSnap(segments);
  const grouper = createEndpointGrouper(snap);
  const adj = buildAdjacency(segments, grouper);
  const used = new Set<string>();
  const rings: Segment2[][] = [];

  while (used.size < segments.length) {
    const start = findStartEdge(adj, used);
    if (!start) break;

    const ring = walkExteriorRing(start.edge, start.startKey, adj, used, segments.length);
    if (ring) rings.push(ring);
    else used.add(start.edge.segKey);
  }

  return rings;
}

function buildRingLineGeometry(ring: Segment2[], z: number): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const verts = ringVertices(ring);
  if (verts.length < 2) return geom;

  const points: [number, number][] = [verts[0]!];
  for (let i = 1; i < verts.length; i++) {
    const v = verts[i]!;
    const last = points[points.length - 1]!;
    if (Math.hypot(v[0] - last[0], v[1] - last[1]) > 1e-6) points.push(v);
  }
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 1e-6) {
    points.push(first);
  }

  const positions: number[] = [];
  const distances = new Float32Array(Math.max(0, (points.length - 1) * 2));
  let total = 0;
  let di = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[i + 1]!;
    positions.push(ax, ay, z, bx, by, z);
    distances[di++] = total;
    total += Math.hypot(bx - ax, by - ay);
    distances[di++] = total;
  }
  if (total > 0) {
    const inv = 1 / total;
    for (let i = 0; i < distances.length; i++) distances[i] *= inv;
    distances[0] = 0;
    distances[distances.length - 1] = 1;
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("lineDistance", new THREE.BufferAttribute(distances, 1));
  return geom;
}

/** 多岛时取最大陆块外轮廓：先按连通分量包围盒，再在该陆块内取面积最大的闭合面 */
export function pickDominantOuterRing(segments: Segment2[]): Segment2[] {
  if (segments.length === 0) return [];

  const components = segmentComponents(segments);
  let dominant = components[0]!;
  let dominantBBox = componentBBoxArea(dominant);
  for (let i = 1; i < components.length; i++) {
    const comp = components[i]!;
    const bbox = componentBBoxArea(comp);
    if (bbox > dominantBBox) {
      dominant = comp;
      dominantBBox = bbox;
    }
  }

  return pickLargestFaceRing(dominant);
}

/** 多岛时取包围面积最大的外轮廓（大陆主体）；内部委托 pickDominantOuterRing */
export function pickLargestAreaRing(segments: Segment2[]): Segment2[] {
  return pickDominantOuterRing(segments);
}

/** @deprecated 使用 pickLargestAreaRing（按面积而非周长） */
export function pickLongestRing(segments: Segment2[]): Segment2[] {
  return pickLargestAreaRing(segments);
}

function orderRingExterior(ring: Segment2[]): Segment2[] {
  if (ring.length <= 1) return ring;

  const snap = resolveAdjSnap(ring);
  const grouper = createEndpointGrouper(snap);
  const adj = buildAdjacency(ring, grouper);
  const used = new Set<string>();
  const start = findStartEdge(adj, used);
  if (!start) return ring;

  const walked =
    walkExteriorRing(start.edge, start.startKey, adj, new Set<string>(), ring.length) ??
    walkOuterRing(start.edge, start.startKey, adj, new Set<string>(), ring.length);
  return walked && walked.length === ring.length ? walked : ring;
}

/** 从顶盖 borderLines 收集 2D 边段（与挤出顶面 Z 对齐） */
export function lineSegmentsToCapSegments(lines: THREE.LineSegments): Segment2[] {
  const pos = lines.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos || pos.count < 2) return [];
  const segments: Segment2[] = [];
  for (let i = 0; i < pos.count; i += 2) {
    segments.push({
      ax: pos.getX(i),
      ay: pos.getY(i),
      bx: pos.getX(i + 1),
      by: pos.getY(i + 1),
    });
  }
  return segments;
}

/** 合并多块顶盖边线后仅保留外轮廓（共享边出现 2 次） */
export function pickOuterPerimeterFromCapSegments(segments: Segment2[]): Segment2[] {
  const counts = new Map<string, number>();
  const canonical = new Map<string, Segment2>();
  for (const seg of segments) {
    const key = segmentKey(seg);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    canonical.set(key, seg);
  }
  return [...counts.entries()]
    .filter(([, count]) => count === 1)
    .map(([key]) => canonical.get(key)!);
}

export function collectCapBorderSegments(meshes: THREE.Object3D[]): Segment2[] {
  const all: Segment2[] = [];
  for (const mesh of meshes) {
    const border = mesh.userData.borderLines as THREE.LineSegments | undefined;
    if (!border) continue;
    all.push(...lineSegmentsToCapSegments(border));
  }
  return all;
}

function buildFlowBundleFromRing(
  orderedRing: Segment2[],
  z: number,
  borderColor: number,
  isDark: boolean,
  borderOpacity: number,
  borderFlow: ResolvedGeoRegionBorderFlow,
): GeoOuterBorderFlowBundle | null {
  if (!borderFlow.enabled || orderedRing.length === 0) return null;

  const geom = buildRingLineGeometry(orderedRing, z);
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
    z + 0.004,
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

/** 从已构建的顶盖边线生成外轮廓流光（与 mesh 顶面 Z 对齐） */
export function buildGeoOuterBorderFlowFromCapSegments(
  capSegments: Segment2[],
  z: number,
  borderColor: number,
  isDark: boolean,
  borderOpacity: number,
  borderFlow: ResolvedGeoRegionBorderFlow,
): GeoOuterBorderFlowBundle | null {
  if (!borderFlow.enabled || capSegments.length === 0) return null;
  const outerSegments = pickOuterPerimeterFromCapSegments(capSegments);
  const orderedRing = orderRingExterior(pickLargestAreaRing(outerSegments));
  return buildFlowBundleFromRing(orderedRing, z, borderColor, isDark, borderOpacity, borderFlow);
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
  const orderedRing = orderRingExterior(pickLargestAreaRing(outerSegments));
  return buildFlowBundleFromRing(orderedRing, z, borderColor, isDark, borderOpacity, borderFlow);
}
