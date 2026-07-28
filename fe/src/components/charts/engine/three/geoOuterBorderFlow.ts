import * as THREE from "three";
import { prepareOfflineGeoGeometry } from "@/components/charts/engine/geo/geoProjection";
import type { ResolvedGeoRegionBorderFlow } from "@/components/charts/engine/geo/geoRegionBorderStyle";
import {
  createGeoBorderFlowMaterial,
  trailLengthToFlowTrailWidth,
} from "@/components/charts/engine/three/geoBorderFlowMaterial";
import {
  createGeoBorderFlyLine,
  type GeoBorderFlyLineSystem,
} from "@/components/charts/engine/three/geoBorderFlowFlyLine";

export type GeoOuterBorderFlowBundle = {
  group: THREE.Group;
  /** 扫光动画层（整圈线段） */
  lines: THREE.LineSegments;
  /** 整圈底线（始终可见） */
  baseLines: THREE.LineSegments;
  /** Demo0 点状彗星拖尾 */
  flyLine: GeoBorderFlyLineSystem;
};

type Segment2 = { ax: number; ay: number; bx: number; by: number };
type ProjectFn = (coord: [number, number]) => [number, number] | null;

export type GeoOuterBorderFlowPathOptions = {
  projectForPath?: ProjectFn;
  offsetX?: number;
  offsetY?: number;
  flowProjection?: unknown;
  viewport?: { width: number; height: number };
  /** 当前地图投影包围盒：用于拒绝细长海岸碎带 */
  projBounds?: { minX: number; maxX: number; minY: number; maxY: number };
};

/** 闭合外轮廓最少边数（含下钻省/市） */
export const MIN_OUTER_BORDER_FLOW_SEGMENTS = 3;

export function ringPerimeter(ring: Segment2[]): number {
  return ring.reduce((sum, seg) => sum + Math.hypot(seg.bx - seg.ax, seg.by - seg.ay), 0);
}

function boundsFromSegments(
  segments: Segment2[],
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (segments.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const seg of segments) {
    minX = Math.min(minX, seg.ax, seg.bx);
    maxX = Math.max(maxX, seg.ax, seg.bx);
    minY = Math.min(minY, seg.ay, seg.by);
    maxY = Math.max(maxY, seg.ay, seg.by);
  }
  return { minX, maxX, minY, maxY };
}

/** 贪心桥接：按端点最近邻串联外缘（允许小缝隙），避免半边碎成两千个小环 */
export function greedyBridgeOuterPath(
  segments: Segment2[],
  maxGap: number,
): Segment2[] {
  if (segments.length === 0) return [];
  const remaining = segments.map((s, i) => ({ ...s, _i: i }));
  // 从最西端点出发
  let startIdx = 0;
  let bestX = Infinity;
  for (let i = 0; i < remaining.length; i++) {
    const s = remaining[i]!;
    if (s.ax < bestX) {
      bestX = s.ax;
      startIdx = i;
    }
    if (s.bx < bestX) {
      bestX = s.bx;
      startIdx = i;
    }
  }
  let cur = remaining.splice(startIdx, 1)[0]!;
  // 让起点落在西侧
  if (cur.bx < cur.ax) cur = { ax: cur.bx, ay: cur.by, bx: cur.ax, by: cur.ay };
  const path: Segment2[] = [cur];
  let x = cur.bx;
  let y = cur.by;

  while (remaining.length > 0) {
    let bestI = -1;
    let bestD = Infinity;
    let flip = false;
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i]!;
      const d1 = Math.hypot(s.ax - x, s.ay - y);
      const d2 = Math.hypot(s.bx - x, s.by - y);
      if (d1 < bestD) {
        bestD = d1;
        bestI = i;
        flip = false;
      }
      if (d2 < bestD) {
        bestD = d2;
        bestI = i;
        flip = true;
      }
    }
    if (bestI < 0 || bestD > maxGap) break;
    let s = remaining.splice(bestI, 1)[0]!;
    if (flip) s = { ax: s.bx, ay: s.by, bx: s.ax, by: s.ay };
    path.push({ ax: x, ay: y, bx: s.bx, by: s.by });
    x = s.bx;
    y = s.by;
  }
  return path.length >= MIN_OUTER_BORDER_FLOW_SEGMENTS ? weldRingEndpoints(path) : [];
}

/**
 * 对标 sc-datav：独立外轮廓路径。
 * 经纬度空间取外缘 → 最大陆块 → 贪心桥接成长路径 → 投影到 mesh。
 */
export function buildDominantLandOuterRing(
  geometries: GeoJSON.Geometry[],
  project: ProjectFn,
  _bounds?: { minX: number; maxX: number; minY: number; maxY: number },
): Segment2[] {
  if (geometries.length === 0) return [];
  const identity = (coord: [number, number]) => coord;
  const outerLonLat = pickOuterPerimeterSegments(geometries, identity);
  if (outerLonLat.length === 0) return [];

  const dominantLonLat = pickDominantComponent(outerLonLat);
  const domBounds = boundsFromSegments(dominantLonLat);
  const span = domBounds
    ? Math.max(domBounds.maxX - domBounds.minX, domBounds.maxY - domBounds.minY)
    : 1;
  // 经纬度桥接缝：约 0.15°（~15km），吞掉省界数字化缝隙
  const maxGap = Math.max(0.08, Math.min(0.35, span / 200));

  let ringLonLat = greedyBridgeOuterPath(dominantLonLat, maxGap);
  if (ringLonLat.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) {
    ringLonLat = acceptDominantOuterRing(outerLonLat);
  }
  if (ringLonLat.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) return [];

  const projected: Segment2[] = [];
  for (const seg of ringLonLat) {
    const a = project([seg.ax, seg.ay]);
    const b = project([seg.bx, seg.by]);
    if (!a || !b) continue;
    if (a[0] === b[0] && a[1] === b[1]) continue;
    projected.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
  }
  if (projected.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) return [];
  return weldRingEndpoints(projected);
}

/**
 * 从外缘边段取最大陆块岸线环（按环包围盒选最大面 = 贴岸外轮廓）。
 */
export function acceptDominantOuterRing(outer: Segment2[]): Segment2[] {
  if (outer.length === 0) return [];
  const ring = pickDominantOuterRing(outer);
  if (ring.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) return [];
  return ring;
}

/** 相邻边端点焊接为连续折线（拓扑吸附造成的微缝抹平，不改远点） */
export function weldRingEndpoints(ring: Segment2[]): Segment2[] {
  if (ring.length < 2) return ring.slice();
  const out: Segment2[] = [];
  let ax = ring[0]!.ax;
  let ay = ring[0]!.ay;
  for (let i = 0; i < ring.length; i++) {
    const seg = ring[i]!;
    out.push({ ax, ay, bx: seg.bx, by: seg.by });
    ax = seg.bx;
    ay = seg.by;
  }
  const first = out[0]!;
  const last = out[out.length - 1]!;
  last.bx = first.ax;
  last.by = first.ay;
  return out;
}

function pickDominantComponent(segments: Segment2[]): Segment2[] {
  const components = segmentComponents(segments);
  if (components.length === 0) return [];
  let dominant = components[0]!;
  let best = componentBBoxArea(dominant);
  for (let i = 1; i < components.length; i++) {
    const comp = components[i]!;
    const bbox = componentBBoxArea(comp);
    if (bbox > best) {
      dominant = comp;
      best = bbox;
    }
  }
  return dominant;
}

/** 单调链凸包 → 闭合边段环（顺时针/逆时针皆可，shader 再统一方向） */
export function convexHullRing(segments: Segment2[]): Segment2[] {
  if (segments.length === 0) return [];
  const keySet = new Set<string>();
  const pts: Array<[number, number]> = [];
  for (const seg of segments) {
    for (const [x, y] of [
      [seg.ax, seg.ay],
      [seg.bx, seg.by],
    ] as const) {
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      if (keySet.has(key)) continue;
      keySet.add(key);
      pts.push([x, y]);
    }
  }
  if (pts.length < 3) return [];
  pts.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Array<[number, number]> = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Array<[number, number]> = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);
  if (hull.length < 3) return [];

  const ring: Segment2[] = [];
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    ring.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
  }
  return ring;
}

function countBorderFlowLineSegments(bundle: GeoOuterBorderFlowBundle): number {
  const pos = bundle.lines.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  return pos ? pos.count / 2 : 0;
}

export function isViableOuterBorderFlowBundle(
  bundle: GeoOuterBorderFlowBundle | null,
  minSegments = MIN_OUTER_BORDER_FLOW_SEGMENTS,
): bundle is GeoOuterBorderFlowBundle {
  if (!bundle) return false;
  const segs = countBorderFlowLineSegments(bundle);
  // 至少一圈像样的外缘；拒绝 3～4 段海岸碎三角冒充外轮廓
  return segs >= Math.max(minSegments, 8);
}

/** 流光路径周长（用于 cap 碎环 vs GeoJSON 整圈择优） */
export function bundleRingPerimeter(bundle: GeoOuterBorderFlowBundle): number {
  const pos = bundle.lines.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos || pos.count < 2) return 0;
  let total = 0;
  for (let i = 0; i < pos.count; i += 2) {
    total += Math.hypot(
      pos.getX(i + 1) - pos.getX(i),
      pos.getY(i + 1) - pos.getY(i),
      pos.getZ(i + 1) - pos.getZ(i),
    );
  }
  return total;
}

/**
 * cap 仅在周长接近 GeoJSON 整圈时采用（贴 mesh）；
 * 海岸碎环段数够但周长短，必须回退，否则飞线会在局部来回转。
 */
export function pickPreferredOuterBorderFlowBundle(
  capBundle: GeoOuterBorderFlowBundle | null,
  geoBundle: GeoOuterBorderFlowBundle | null,
): GeoOuterBorderFlowBundle | null {
  const capOk = isViableOuterBorderFlowBundle(capBundle);
  const geoOk = isViableOuterBorderFlowBundle(geoBundle);

  if (capOk && geoOk) {
    const capPerim = bundleRingPerimeter(capBundle);
    const geoPerim = bundleRingPerimeter(geoBundle);
    if (geoPerim > 0 && capPerim >= geoPerim * 0.55) {
      disposeGeoOuterBorderFlowBundle(geoBundle);
      return capBundle;
    }
    disposeGeoOuterBorderFlowBundle(capBundle);
    return geoBundle;
  }
  if (capOk) {
    disposeGeoOuterBorderFlowBundle(geoBundle);
    return capBundle;
  }
  if (geoOk) {
    disposeGeoOuterBorderFlowBundle(capBundle);
    return geoBundle;
  }
  disposeGeoOuterBorderFlowBundle(capBundle);
  disposeGeoOuterBorderFlowBundle(geoBundle);
  return null;
}

function resolveFlowRingOffset(
  meshProject: ProjectFn,
  flowProject: ProjectFn,
  refs: [number, number][],
): { x: number; y: number } {
  for (const ref of refs) {
    const mesh = meshProject(ref);
    const flow = flowProject(ref);
    if (mesh && flow) {
      return { x: mesh[0] - flow[0], y: mesh[1] - flow[1] };
    }
  }
  return { x: 0, y: 0 };
}

function shiftRing(ring: Segment2[], dx: number, dy: number): Segment2[] {
  if (dx === 0 && dy === 0) return ring;
  return ring.map((seg) => ({
    ax: seg.ax + dx,
    ay: seg.ay + dy,
    bx: seg.bx + dx,
    by: seg.by + dy,
  }));
}

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

/** 按当前地图尺度自适应端点吸附半径（仅拓扑连通；边几何仍用原始坐标） */
export function resolveAdjSnap(segments: Segment2[]): number {
  if (segments.length === 0) return 0.25;
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
  // 连通海岸缝隙，但避免过大把岸线顶点吸并成折线捷径
  return Math.max(0.15, Math.min(1.5, span / 250));
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
  const orientHalfEdge = (he: HalfEdge): Segment2 => {
    const aKey = grouper(he.seg.ax, he.seg.ay);
    if (aKey === he.from) return he.seg;
    return { ax: he.seg.bx, ay: he.seg.by, bx: he.seg.ax, by: he.seg.ay };
  };
  for (const start of halfEdges) {
    if (start.visited) continue;
    const ring: Segment2[] = [];
    let cur: HalfEdge | undefined = start;
    let guard = 0;
    while (cur && !cur.visited && guard < maxSteps) {
      cur.visited = true;
      // 保留原始边坐标（吸附键只做拓扑），严丝合缝贴顶盖外缘
      ring.push(orientHalfEdge(cur));
      cur = cur.next;
      guard += 1;
      if (cur === start) break;
    }
    if (ring.length >= 3 && cur === start) faces.push(ring);
  }

  return faces;
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
  if (ring.length === 0) return geom;

  const positions: number[] = [];
  const closeGap =
    ring.length > 1
      ? Math.hypot(ring[0]!.ax - ring[ring.length - 1]!.bx, ring[0]!.ay - ring[ring.length - 1]!.by) >
        1e-5
      : false;
  const lineCount = ring.length + (closeGap ? 1 : 0);
  const distances = new Float32Array(lineCount * 2);
  let total = 0;
  let di = 0;

  for (const seg of ring) {
    positions.push(seg.ax, seg.ay, z, seg.bx, seg.by, z);
    distances[di++] = total;
    total += Math.hypot(seg.bx - seg.ax, seg.by - seg.ay);
    distances[di++] = total;
  }

  if (closeGap) {
    const last = ring[ring.length - 1]!;
    const first = ring[0]!;
    positions.push(last.bx, last.by, z, first.ax, first.ay, z);
    distances[di++] = total;
    total += Math.hypot(first.ax - last.bx, first.ay - last.by);
    distances[di++] = total;
  }

  if (total > 0) {
    const inv = 1 / total;
    for (let i = 0; i < distances.length; i++) distances[i]! *= inv;
    distances[0] = 0;
    distances[distances.length - 1] = 1;
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("lineDistance", new THREE.BufferAttribute(distances, 1));
  return geom;
}

function ringBBoxSize(ring: Segment2[]): { w: number; h: number } {
  if (ring.length === 0) return { w: 0, h: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const seg of ring) {
    minX = Math.min(minX, seg.ax, seg.bx);
    maxX = Math.max(maxX, seg.ax, seg.bx);
    minY = Math.min(minY, seg.ay, seg.by);
    maxY = Math.max(maxY, seg.ay, seg.by);
  }
  return { w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
}

function ringSpan(ring: Segment2[]): number {
  const { w, h } = ringBBoxSize(ring);
  return Math.max(w, h);
}

/** 大陆外缘须在宽、高两个方向都接近参考范围（拒绝细长海岸碎带） */
export function isFullLandOutlineRing(ring: Segment2[], reference: Segment2[]): boolean {
  if (ring.length < MIN_OUTER_BORDER_FLOW_SEGMENTS || reference.length === 0) return false;
  const a = ringBBoxSize(ring);
  const b = ringBBoxSize(reference);
  if (b.w < 1e-6 || b.h < 1e-6) return false;
  return a.w >= b.w * 0.45 && a.h >= b.h * 0.45;
}

export function ringCoversProjBounds(
  ring: Segment2[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
): boolean {
  if (ring.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) return false;
  const a = ringBBoxSize(ring);
  const bw = Math.max(1e-6, bounds.maxX - bounds.minX);
  const bh = Math.max(1e-6, bounds.maxY - bounds.minY);
  return a.w >= bw * 0.45 && a.h >= bh * 0.45;
}

/** 从已有外缘边段取覆盖范围最大的闭合环（半边面 + 链式，按 bounds 覆盖率排序） */
export function pickLargestCoverageOuterRing(
  outerSegments: Segment2[],
  bounds?: { minX: number; maxX: number; minY: number; maxY: number },
): Segment2[] {
  if (outerSegments.length === 0) return [];
  const dominant = pickDominantComponent(outerSegments);
  const candidates = [
    ...traceFacesWithHalfEdges(dominant),
    ...chainSegmentsIntoRings(dominant),
  ].filter((ring) => ring.length >= MIN_OUTER_BORDER_FLOW_SEGMENTS);
  if (candidates.length === 0) return [];

  const scored = candidates.map((ring) => {
    const size = ringBBoxSize(ring);
    let cover = size.w * size.h;
    if (bounds) {
      const bw = Math.max(1e-6, bounds.maxX - bounds.minX);
      const bh = Math.max(1e-6, bounds.maxY - bounds.minY);
      cover = Math.min(1, size.w / bw) * Math.min(1, size.h / bh);
    }
    return { ring, cover, area: size.w * size.h, perim: ringPerimeter(ring), n: ring.length };
  });
  // 覆盖率优先，其次面积与段数（避免 3 段「大方框」捷径）
  scored.sort(
    (a, b) => b.cover - a.cover || b.area - a.area || b.n - a.n || b.perim - a.perim,
  );
  return weldRingEndpoints(scored[0]!.ring);
}

function scoreOuterRing(ring: Segment2[]): number {
  const { w, h } = ringBBoxSize(ring);
  // 面积为主，周长微调；细长碎带 min(w,h) 小会被压低
  return w * h * (1 + Math.min(w, h) / Math.max(w, h, 1e-6));
}

/** 多岛时取最大陆块外轮廓：连通分量取最大包围盒，再取「包围盒大且周长够长」的闭合面 */
export function pickDominantOuterRing(segments: Segment2[]): Segment2[] {
  if (segments.length === 0) return [];
  const dominant = pickDominantComponent(segments);
  const faces = traceFacesWithHalfEdges(dominant);
  let best: Segment2[] = [];
  if (faces.length > 0) {
    const scored = faces.map((ring) => {
      const bbox = ringBBoxArea(ring);
      const perim = ringPerimeter(ring);
      const minPerim = Math.sqrt(Math.max(bbox, 1)) * 1.5;
      const score = perim >= minPerim ? bbox : bbox * 0.01;
      return { ring, score };
    });
    best = scored.reduce((a, b) => (a.score > b.score ? a : b)).ring;
  } else {
    const chained = chainSegmentsIntoRings(dominant);
    if (chained.length === 0) return [];
    best = chained.reduce((a, b) => (ringBBoxArea(a) > ringBBoxArea(b) ? a : b));
  }
  return weldRingEndpoints(best);
}

/** cap-top 边线外轮廓：委托最大陆块选环 */
export function pickDominantCapOuterRing(segments: Segment2[]): Segment2[] {
  return pickDominantOuterRing(segments);
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
  if (segments.length === 0) return [];
  const snap = resolveAdjSnap(segments);
  const grouper = createEndpointGrouper(snap);
  const counts = new Map<string, number>();
  const canonical = new Map<string, Segment2>();

  for (const seg of segments) {
    const [aKey, bKey] = segmentEndpointKey(seg, grouper);
    if (aKey === bKey) continue;
    const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    // 保留顶盖原始坐标，勿用吸附中心改写（否则离岸）
    if (!canonical.has(key)) canonical.set(key, seg);
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
  options?: { drawBaseLines?: boolean },
): GeoOuterBorderFlowBundle | null {
  if (!borderFlow.enabled || orderedRing.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) return null;

  const flowOpacity = borderOpacity ?? (isDark ? 0.92 : 0.88);
  const lineGeom = buildRingLineGeometry(orderedRing, z);
  const pos = lineGeom.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos || pos.count < 2) return null;

  const drawBase = options?.drawBaseLines === true;
  const baseMaterial = new THREE.LineBasicMaterial({
    color: borderFlow.colorHex,
    transparent: true,
    opacity: drawBase ? Math.min(0.55, flowOpacity * 0.5) : 0,
    depthTest: false,
    depthWrite: false,
    visible: drawBase,
  });
  const baseLines = new THREE.LineSegments(lineGeom, baseMaterial);
  baseLines.renderOrder = 25;
  baseLines.frustumCulled = false;
  baseLines.visible = drawBase;

  const flowMaterial = createGeoBorderFlowMaterial({
    baseColorHex: borderColor,
    flowColorHex: borderFlow.colorHex,
    opacity: flowOpacity * 0.85,
    trailWidth: trailLengthToFlowTrailWidth(borderFlow.trailLength),
  });
  const flowGeom = lineGeom.clone();
  const lines = new THREE.LineSegments(flowGeom, flowMaterial);
  lines.renderOrder = 27;
  lines.frustumCulled = false;

  // Demo0 flyLine：沿已有外缘折线滑动（与边线同 Z）
  const flyLine = createGeoBorderFlyLine(
    orderedRing,
    z,
    borderFlow.colorHex,
    Math.min(1, flowOpacity),
    borderFlow.trailLength,
  );

  const group = new THREE.Group();
  group.userData.outerBorderFlow = true;
  group.userData.outerBorderFlowSegs = orderedRing.length;
  group.userData.outerBorderFlowPerimeter = ringPerimeter(orderedRing);
  group.add(baseLines);
  group.add(lines);
  group.add(flyLine.points);

  return { group, lines, baseLines, flyLine };
}

/** 点到线段最近点 */
export function closestPointOnSegment2(
  px: number,
  py: number,
  seg: Segment2,
): { x: number; y: number; distSq: number } {
  const dx = seg.bx - seg.ax;
  const dy = seg.by - seg.ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 1e-12) {
    t = Math.max(0, Math.min(1, ((px - seg.ax) * dx + (py - seg.ay) * dy) / lenSq));
  }
  const x = seg.ax + t * dx;
  const y = seg.ay + t * dy;
  return { x, y, distSq: (px - x) * (px - x) + (py - y) * (py - y) };
}

/**
 * 将外轮廓环顶点吸附到已绘制的顶盖边线上（不另造几何，严丝合缝贴已有边界）。
 */
export function snapRingToExistingBorderSegments(
  ring: Segment2[],
  borderSegments: Segment2[],
  maxSnapDist = Infinity,
): Segment2[] {
  if (ring.length === 0 || borderSegments.length === 0) return ring;

  const snapPt = (x: number, y: number): [number, number] => {
    let bestX = x;
    let bestY = y;
    let bestD = Infinity;
    for (const seg of borderSegments) {
      const c = closestPointOnSegment2(x, y, seg);
      if (c.distSq < bestD) {
        bestD = c.distSq;
        bestX = c.x;
        bestY = c.y;
      }
    }
    if (bestD > maxSnapDist * maxSnapDist) return [x, y];
    return [bestX, bestY];
  };

  const verts: Array<[number, number]> = [[ring[0]!.ax, ring[0]!.ay]];
  for (const seg of ring) verts.push([seg.bx, seg.by]);
  if (verts.length > 1) {
    const first = verts[0]!;
    const last = verts[verts.length - 1]!;
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-9) verts.pop();
  }

  const snapped = verts.map(([x, y]) => snapPt(x, y));
  const out: Segment2[] = [];
  for (let i = 0; i < snapped.length; i++) {
    const a = snapped[i]!;
    const b = snapped[(i + 1) % snapped.length]!;
    if (a[0] === b[0] && a[1] === b[1]) continue;
    out.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
  }
  return out.length >= MIN_OUTER_BORDER_FLOW_SEGMENTS ? out : ring;
}

/**
 * 将 GeoJSON 外缘顺序绑定到已绘制的最外圈边线（不另造岸线几何）。
 * 每条 geo 边匹配一条已有 outer cap 边，保证流光走「已有边界」。
 */
export function bindGeoOuterRingToExistingBorders(
  geoRing: Segment2[],
  existingOuterBorders: Segment2[],
): Segment2[] {
  if (geoRing.length === 0 || existingOuterBorders.length === 0) return geoRing;

  const matched: Segment2[] = [];
  for (const g of geoRing) {
    const gmx = (g.ax + g.bx) * 0.5;
    const gmy = (g.ay + g.by) * 0.5;
    let best: Segment2 | null = null;
    let bestScore = Infinity;
    for (const c of existingOuterBorders) {
      const cmx = (c.ax + c.bx) * 0.5;
      const cmy = (c.ay + c.by) * 0.5;
      const mid = (gmx - cmx) * (gmx - cmx) + (gmy - cmy) * (gmy - cmy);
      const sameDir =
        (g.ax - c.ax) * (g.ax - c.ax) +
        (g.ay - c.ay) * (g.ay - c.ay) +
        (g.bx - c.bx) * (g.bx - c.bx) +
        (g.by - c.by) * (g.by - c.by);
      const flipDir =
        (g.ax - c.bx) * (g.ax - c.bx) +
        (g.ay - c.by) * (g.ay - c.by) +
        (g.bx - c.ax) * (g.bx - c.ax) +
        (g.by - c.ay) * (g.by - c.ay);
      const score = Math.min(mid, sameDir, flipDir);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) continue;
    const dot =
      (best.bx - best.ax) * (g.bx - g.ax) + (best.by - best.ay) * (g.by - g.ay);
    matched.push(
      dot >= 0
        ? { ax: best.ax, ay: best.ay, bx: best.bx, by: best.by }
        : { ax: best.bx, ay: best.by, bx: best.ax, by: best.ay },
    );
  }
  return matched.length >= MIN_OUTER_BORDER_FLOW_SEGMENTS
    ? weldRingEndpoints(matched)
    : geoRing;
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
  const orderedRing = acceptDominantOuterRing(outerSegments);
  return buildFlowBundleFromRing(orderedRing, z, borderColor, isDark, borderOpacity, borderFlow, {
    drawBaseLines: false,
  });
}

export function buildGeoOuterBorderFlowLines(
  geometries: GeoJSON.Geometry[],
  project: ProjectFn,
  z: number,
  borderColor: number,
  isDark: boolean,
  borderOpacity: number,
  borderFlow: ResolvedGeoRegionBorderFlow,
  pathOptions?: GeoOuterBorderFlowPathOptions,
): GeoOuterBorderFlowBundle | null {
  if (!borderFlow.enabled || geometries.length === 0) return null;
  const orderedRing = buildDominantLandOuterRing(geometries, project);
  if (orderedRing.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) return null;
  return buildFlowBundleFromRing(
    shiftRing(orderedRing, pathOptions?.offsetX ?? 0, pathOptions?.offsetY ?? 0),
    z,
    borderColor,
    isDark,
    borderOpacity,
    borderFlow,
    { drawBaseLines: false },
  );
}

/** 从顶盖 borderLines 读取实际 Z（与挤出顶边一致） */
export function resolveCapBorderFlowZ(meshes: THREE.Object3D[], fallbackZ: number): number {
  for (const mesh of meshes) {
    const border = mesh.userData.borderLines as THREE.LineSegments | undefined;
    if (!border) continue;
    const pos = border.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (pos && pos.count > 0) return pos.getZ(0);
  }
  return fallbackZ;
}

/**
 * 沿「已有顶盖边界」最外延移动：
 * 以 projBounds 覆盖为准选全国尺度外缘 → 吸附到已有最外圈边线。
 */
export function buildGeoOuterBorderFlowForMap(
  geometries: GeoJSON.Geometry[],
  capSegments: Segment2[],
  project: ProjectFn,
  z: number,
  borderColor: number,
  isDark: boolean,
  borderOpacity: number,
  borderFlow: ResolvedGeoRegionBorderFlow,
  pathOptions?: GeoOuterBorderFlowPathOptions,
): GeoOuterBorderFlowBundle | null {
  if (!borderFlow.enabled) return null;

  const bounds = pathOptions?.projBounds;
  const existingOuter = pickOuterPerimeterFromCapSegments(capSegments);

  // 1) GeoJSON 整圈（与 mesh 同 project），按 projBounds 覆盖选环
  let ring = shiftRing(
    buildDominantLandOuterRing(geometries, project, bounds),
    pathOptions?.offsetX ?? 0,
    pathOptions?.offsetY ?? 0,
  );

  // 2) 若未覆盖地图包围盒，改从已有最外圈边线选覆盖最大的环
  if (
    existingOuter.length > 0 &&
    bounds &&
    !ringCoversProjBounds(ring, bounds)
  ) {
    const fromCaps = pickLargestCoverageOuterRing(existingOuter, bounds);
    if (ringCoversProjBounds(fromCaps, bounds) || ringBBoxArea(fromCaps) > ringBBoxArea(ring)) {
      ring = fromCaps;
    }
  } else if (ring.length < MIN_OUTER_BORDER_FLOW_SEGMENTS && existingOuter.length > 0) {
    ring = pickLargestCoverageOuterRing(existingOuter, bounds);
  }

  // 3) 顶点吸附到已有最外圈（保持大陆尺度）
  if (ring.length >= MIN_OUTER_BORDER_FLOW_SEGMENTS && existingOuter.length > 0) {
    const snapped = snapRingToExistingBorderSegments(
      ring,
      existingOuter,
      Math.max(0.5, ringSpan(ring) / 12),
    );
    const snapOk = bounds
      ? ringCoversProjBounds(snapped, bounds)
      : isFullLandOutlineRing(snapped, ring);
    if (snapOk) ring = snapped;
  }

  if (ring.length < MIN_OUTER_BORDER_FLOW_SEGMENTS) return null;

  return buildFlowBundleFromRing(ring, z, borderColor, isDark, borderOpacity, borderFlow, {
    drawBaseLines: false,
  });
}

export function disposeGeoOuterBorderFlowBundle(bundle: GeoOuterBorderFlowBundle | null): void {
  if (!bundle) return;
  bundle.flyLine.dispose();
  bundle.lines.geometry.dispose();
  (bundle.lines.material as THREE.Material).dispose();
  if (bundle.baseLines.geometry !== bundle.lines.geometry) {
    bundle.baseLines.geometry.dispose();
  }
  (bundle.baseLines.material as THREE.Material).dispose();
}
