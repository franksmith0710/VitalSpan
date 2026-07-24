import * as THREE from "three";
import { applyGeoCapBboxUv } from "@/components/charts/engine/three/geo/applyGeoCapBboxUv";
import {
  buildTerrainCapMaterial,
  type GeoProjBounds,
  type TerrainCapSource,
} from "@/components/charts/engine/three/geo/applyGeoTerrainSurface";
/** 顶盖上浮，避免与 Extrude 顶面 Z-fighting（对标 sc-datav depth+0.1） */
export const GEO_CAP_Z_EPS = 0.02;

export type GeoFlatPlateMesh = {
  mesh: THREE.Group;
  capMaterial: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
  borderLines: THREE.LineSegments;
};

export type GeoFlatPlateOptions = {
  terrainColorMap?: THREE.Texture;
  terrainNormalMap?: THREE.Texture;
  terrainDisplacementMap?: THREE.Texture;
  displacementScale?: number;
  reliefOn?: boolean;
  projBounds?: GeoProjBounds;
  dataTint?: number;
  valueT?: number;
  terrainSource?: TerrainCapSource;
};

/** 卫星顶盖 Z：明显高于挤出顶面，斜视时不被侧壁 depth 遮挡 */
export function resolveGeoCapTopZ(depth: number): number {
  return depth + Math.max(GEO_CAP_Z_EPS, depth * 0.18);
}

function tuneCapMaterial(mat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial): void {
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -4;
  mat.polygonOffsetUnits = -4;
  mat.depthWrite = true;
  if (mat instanceof THREE.MeshBasicMaterial) {
    mat.side = THREE.DoubleSide;
  }
}

function buildPlateTopOutline(
  shape: THREE.Shape,
  z: number,
  borderColor: number,
  isDark: boolean,
): THREE.LineSegments {
  const { shape: outline, holes } = shape.extractPoints(12);
  const positions: number[] = [];
  const pushRing = (pts: THREE.Vector2[]) => {
    if (pts.length < 2) return;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      positions.push(a.x, a.y, z, b.x, b.y, z);
    }
  };
  pushRing(outline);
  for (const hole of holes) pushRing(hole);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(
    geom,
    new THREE.LineBasicMaterial({
      color: borderColor,
      transparent: true,
      opacity: isDark ? 0.72 : 0.62,
      depthTest: true,
    }),
  );
  lines.renderOrder = 11;
  return lines;
}

/** sc-datav Demo1：Shape 顶盖贴图 + Extrude 侧壁挤压 */
export function buildGeoFlatPlateMesh(
  shape: THREE.Shape,
  depth: number,
  capColor: number,
  borderColor: number,
  isDark: boolean,
  options: GeoFlatPlateOptions = {},
): GeoFlatPlateMesh {
  const hasTerrain = Boolean(options.terrainColorMap && options.projBounds);
  const dataTint = new THREE.Color(options.dataTint ?? capColor);
  const valueT = options.valueT ?? 1;
  const capTopZ = resolveGeoCapTopZ(depth);

  const displacementScale =
    hasTerrain && options.reliefOn && options.terrainDisplacementMap
      ? (options.displacementScale ?? 0)
      : 0;

  const invisibleCap = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: isDark ? 0x14202e : 0x3d4f5f,
    roughness: 0.92,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });

  const capMaterial = hasTerrain
    ? buildTerrainCapMaterial(
        options.terrainColorMap!,
        options.terrainNormalMap,
        options.terrainDisplacementMap,
        dataTint,
        valueT,
        isDark,
        displacementScale,
        options.terrainSource ?? "satellite",
      )
    : new THREE.MeshStandardMaterial({
        color: dataTint,
        emissive: dataTint,
        emissiveIntensity: isDark ? 0.18 : 0.1,
        metalness: 0.08,
        roughness: 0.65,
        side: THREE.DoubleSide,
      });
  tuneCapMaterial(capMaterial);

  const extrudeGeometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });

  const bodyMesh = new THREE.Mesh(extrudeGeometry, [sideMaterial, invisibleCap]);
  bodyMesh.renderOrder = 0;

  const borderLines = buildPlateTopOutline(shape, capTopZ + 0.008, borderColor, isDark);

  const capGeometry = new THREE.ShapeGeometry(shape);
  if (hasTerrain) {
    applyGeoCapBboxUv(capGeometry, options.projBounds!);
  }
  const capMesh = new THREE.Mesh(capGeometry, capMaterial);
  capMesh.position.z = capTopZ;
  capMesh.renderOrder = 10;
  capMesh.userData.capMaterial = capMaterial;

  const group = new THREE.Group();
  group.add(bodyMesh);
  group.add(capMesh);
  group.add(borderLines);
  group.userData.capMaterial = capMaterial;

  return { mesh: group, capMaterial, borderLines };
}
