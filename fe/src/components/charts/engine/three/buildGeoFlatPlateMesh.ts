import * as THREE from "three";
import { applyGeoCapBboxUv } from "@/components/charts/engine/three/geo/applyGeoCapBboxUv";
import {
  applyGeoCapNationalBridgeUv,
  type GeoCapNationalUvBridge,
} from "@/components/charts/engine/three/geo/applyGeoCapNationalBridgeUv";
import {
  buildTerrainCapMaterial,
  type GeoProjBounds,
  type TerrainCapSource,
} from "@/components/charts/engine/three/geo/applyGeoTerrainSurface";
/** 顶盖上浮，避免与 Extrude 顶面 Z-fighting（对标 sc-datav depth+0.1） */
export const GEO_CAP_Z_EPS = 0.02;

/** 挤出厚度相对地图投影跨度的比例（布局归一化前后视觉一致） */
const PLATE_DEPTH_SPAN_RATIO = 0.032;

export type GeoProjBoundsLike = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/** 按 projBounds 跨度算厚度，避免下钻后省域变小而挤出仍按视口像素变“柱体” */
export function resolveGeoPlateDepth(
  projBounds: GeoProjBoundsLike,
  plateScale: number,
  drillDepth = 0,
): number {
  const span = Math.max(projBounds.maxX - projBounds.minX, projBounds.maxY - projBounds.minY, 0.5);
  const drillFactor = drillDepth <= 0 ? 1 : drillDepth === 1 ? 0.88 : 0.72;
  return span * PLATE_DEPTH_SPAN_RATIO * plateScale * drillFactor;
}

/** 卫星顶盖贴齐挤出顶面；polygonOffset 已防 Z-fighting，勿再大幅上浮 */
export function resolveGeoCapTopZ(depth: number, satelliteCap = false): number {
  if (satelliteCap) return depth + GEO_CAP_Z_EPS;
  return depth + Math.max(GEO_CAP_Z_EPS, depth * 0.05);
}

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
  /** 下钻：局部 mesh → 全国贴图 UV */
  uvBridge?: GeoCapNationalUvBridge;
  dataTint?: number;
  valueT?: number;
  terrainSource?: TerrainCapSource;
};

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
  const hasTerrain = Boolean(options.terrainColorMap && (options.projBounds || options.uvBridge));
  const dataTint = new THREE.Color(options.dataTint ?? capColor);
  const valueT = options.valueT ?? 1;
  const capTopZ = resolveGeoCapTopZ(depth, hasTerrain);

  const displacementScale =
    hasTerrain && options.reliefOn && options.terrainDisplacementMap
      ? (options.displacementScale ?? 0)
      : 0;

  /** 侧壁 + 挤出顶底面同一实体材质，形成实心柱体（避免仅两侧薄片、中间镂空） */
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: isDark ? 0x243448 : 0x4a5c6a,
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide,
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

  const bodyMesh = new THREE.Mesh(extrudeGeometry, [shellMaterial, shellMaterial]);
  bodyMesh.renderOrder = 0;

  const borderLines = buildPlateTopOutline(shape, capTopZ + 0.008, borderColor, isDark);

  const capGeometry = new THREE.ShapeGeometry(shape);
  if (hasTerrain) {
    if (options.uvBridge) {
      applyGeoCapNationalBridgeUv(capGeometry, options.uvBridge);
    } else {
      applyGeoCapBboxUv(capGeometry, options.projBounds!);
    }
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
