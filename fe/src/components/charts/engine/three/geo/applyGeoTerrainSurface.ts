import type * as d3 from "d3";
import * as THREE from "three";
import type { TerrainGeoBounds } from "@/components/charts/engine/three/geo/chinaTerrainLoader";

export type GeoProjBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function computeGeoProjBounds(
  features: Array<{ geometry: GeoJSON.Geometry | null }>,
  project: (coord: [number, number]) => [number, number] | null,
): GeoProjBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const visit = (coord: [number, number]) => {
    const p = project(coord);
    if (!p) return;
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  };

  const walk = (geometry: GeoJSON.Geometry) => {
    if (geometry.type === "Polygon") {
      for (const ring of geometry.coordinates) {
        for (const c of ring) visit(c as [number, number]);
      }
    } else if (geometry.type === "MultiPolygon") {
      for (const poly of geometry.coordinates) {
        for (const ring of poly) {
          for (const c of ring) visit(c as [number, number]);
        }
      }
    }
  };

  for (const f of features) {
    if (f.geometry) walk(f.geometry);
  }

  const padX = (maxX - minX) * 0.02 || 1;
  const padY = (maxY - minY) * 0.02 || 1;
  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  };
}

export type GeoMapLayoutMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type TerrainSurfaceOpts = {
  geoBounds: TerrainGeoBounds;
  projBounds: GeoProjBounds;
  depth: number;
  projection: d3.GeoProjection;
  viewport: { width: number; height: number };
  margin: GeoMapLayoutMargin;
  centerX: number;
  centerY: number;
};

function projectionPlaneFromThree(
  x: number,
  y: number,
  viewport: { width: number; height: number },
  margin: GeoMapLayoutMargin,
): [number, number] {
  return [x + viewport.width / 2 - margin.left, viewport.height / 2 - y - margin.top];
}

/** 顶面 UV：经纬度对齐 hillshade（纹理按 lng/lat 栅格生成） */
function capUvFromPosition(x: number, y: number, opts: TerrainSurfaceOpts): [number, number] {
  const { geoBounds, projBounds, projection, viewport, margin, centerX, centerY } = opts;
  const lngSpan = geoBounds.east - geoBounds.west || 1;
  const latSpan = geoBounds.north - geoBounds.south || 1;
  const spanX = projBounds.maxX - projBounds.minX || 1;
  const spanY = projBounds.maxY - projBounds.minY || 1;

  const [px, py] = projectionPlaneFromThree(x + centerX, y + centerY, viewport, margin);
  const lngLat = projection.invert?.([px, py]);
  if (lngLat) {
    const u = (lngLat[0] - geoBounds.west) / lngSpan;
    const v = 1 - (lngLat[1] - geoBounds.south) / latSpan;
    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
      return [u, v];
    }
  }

  const u = (x - projBounds.minX) / spanX;
  const v = 1 - (y - projBounds.minY) / spanY;
  return [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))];
}

function isTopCapVertex(z: number, depth: number): boolean {
  return z >= depth * 0.5;
}

function writeCapUvsForRange(
  pos: THREE.BufferAttribute,
  uvs: Float32Array,
  start: number,
  count: number,
  depth: number,
  opts: TerrainSurfaceOpts,
): void {
  for (let i = start; i < start + count; i += 1) {
    const z = pos.getZ(i);
    if (!isTopCapVertex(z, depth)) continue;
    const [u, v] = capUvFromPosition(pos.getX(i), pos.getY(i), opts);
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
}

/** 写入 cap UV；按 ExtrudeGeometry group 定位顶面，不 mergeVertices */
export function applyTerrainToExtrudeGeometry(
  geometry: THREE.ExtrudeGeometry,
  opts: TerrainSurfaceOpts,
): THREE.ExtrudeGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const uvs = new Float32Array(pos.count * 2);
  const { depth } = opts;

  const capGroups = geometry.groups.filter((g) => g.materialIndex === 1);
  if (capGroups.length > 0) {
    for (const group of capGroups) {
      writeCapUvsForRange(pos, uvs, group.start, group.count, depth, opts);
    }
  } else {
    writeCapUvsForRange(pos, uvs, 0, pos.count, depth, opts);
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

export function lngLatToTerrainUv(
  lng: number,
  lat: number,
  geoBounds: TerrainGeoBounds,
): [number, number] {
  const lngSpan = geoBounds.east - geoBounds.west || 1;
  const latSpan = geoBounds.north - geoBounds.south || 1;
  const u = Math.max(0, Math.min(1, (lng - geoBounds.west) / lngSpan));
  const v = Math.max(0, Math.min(1, 1 - (lat - geoBounds.south) / latSpan));
  return [u, v];
}
