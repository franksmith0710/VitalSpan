import * as d3 from "d3";
import * as THREE from "three";

export type JoinedMapFeature = {
  name: string;
  value: number;
  adcode?: number;
  geometry: GeoJSON.Geometry | null;
};

/** 从离线 GeoJSON 几何计算质心（lng, lat） */
export function resolveRegionCentroidLngLat(
  geometry: GeoJSON.Geometry | null | undefined,
): [number, number] | null {
  if (!geometry) return null;
  const feature: GeoJSON.Feature = { type: "Feature", properties: {}, geometry };
  const c = d3.geoCentroid(feature);
  if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
  return [c[0], c[1]];
}

function ringCentroidProjected(
  ring: [number, number][],
  project: (coord: [number, number]) => [number, number] | null,
): [number, number] | null {
  const pts: [number, number][] = [];
  for (const coord of ring) {
    const p = project(coord);
    if (p) pts.push(p);
  }
  if (pts.length === 0) return null;
  if (pts.length < 3) {
    const sx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
    const sy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
    return [sx, sy];
  }
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const cross = x0 * y1 - x1 * y0;
    area2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(area2) < 1e-6) {
    const sx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
    const sy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
    return [sx, sy];
  }
  return [cx / (3 * area2), cy / (3 * area2)];
}

/** 与 mesh 顶点同一投影平面上的质心（避免经纬度质心投影偏移） */
export function resolveRegionCentroidProjected(
  geometry: GeoJSON.Geometry | null | undefined,
  project: (coord: [number, number]) => [number, number] | null,
): [number, number] | null {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    const outer = geometry.coordinates[0] as [number, number][] | undefined;
    return outer ? ringCentroidProjected(outer, project) : null;
  }
  if (geometry.type === "MultiPolygon") {
    let sumX = 0;
    let sumY = 0;
    let weight = 0;
    for (const poly of geometry.coordinates) {
      const outer = poly[0] as [number, number][] | undefined;
      if (!outer) continue;
      const c = ringCentroidProjected(outer, project);
      if (!c) continue;
      sumX += c[0];
      sumY += c[1];
      weight += 1;
    }
    if (weight === 0) return null;
    return [sumX / weight, sumY / weight];
  }
  if (geometry.type === "Point") {
    return project(geometry.coordinates as [number, number]);
  }
  return null;
}

export type RegionPointSample = {
  name: string;
  value: number;
  adcode?: number;
  /** 投影平面坐标（与 threeGeoProject.project 一致） */
  x: number;
  y: number;
  valueT: number;
};

export function buildRegionPointSamples(
  features: JoinedMapFeature[],
  project: (coord: [number, number]) => [number, number] | null,
  minVal: number,
  maxVal: number,
): RegionPointSample[] {
  const span = maxVal - minVal;
  const samples: RegionPointSample[] = [];
  for (const feature of features) {
    const projected =
      resolveRegionCentroidProjected(feature.geometry, project) ??
      (() => {
        const lngLat = resolveRegionCentroidLngLat(feature.geometry);
        return lngLat ? project(lngLat) : null;
      })();
    if (!projected) continue;
    const valueT = span <= 0 ? 1 : (feature.value - minVal) / span;
    samples.push({
      name: feature.name,
      value: feature.value,
      adcode: feature.adcode,
      x: projected[0],
      y: projected[1],
      valueT: Math.min(1, Math.max(0, valueT)),
    });
  }
  return samples;
}

export function resolveRegionCapAnchorLocal(
  meshes: THREE.Object3D[],
  name: string,
  capTopZ: number,
): { x: number; y: number; z: number } | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const mesh of meshes) {
    if (String(mesh.userData?.name ?? "") !== name) continue;
    const local = mesh.userData.capAnchorLocal as THREE.Vector3 | undefined;
    if (!local) continue;
    sumX += local.x;
    sumY += local.y;
    count += 1;
  }
  if (count === 0) return null;
  return { x: sumX / count, y: sumY / count, z: capTopZ };
}

export function resolveRegionCapAnchorWorld(
  meshes: THREE.Object3D[],
  name: string,
  mapGroup: THREE.Group,
  capTopZ: number,
  extraZ: number,
  target = new THREE.Vector3(),
): THREE.Vector3 | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const mesh of meshes) {
    if (String(mesh.userData?.name ?? "") !== name) continue;
    const local = mesh.userData.capAnchorLocal as THREE.Vector3 | undefined;
    if (!local) continue;
    sumX += local.x;
    sumY += local.y;
    count += 1;
  }
  if (count === 0) return null;
  mapGroup.updateMatrixWorld(true);
  return target
    .set(sumX / count, sumY / count, capTopZ + extraZ)
    .applyMatrix4(mapGroup.matrixWorld);
}

export function resolvePillarTopWorld(
  pillarGroup: THREE.Object3D,
  barHeight: number,
  labelOffset: number,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  pillarGroup.updateMatrixWorld(true);
  return target.set(0, 0, barHeight + labelOffset).applyMatrix4(pillarGroup.matrixWorld);
}
