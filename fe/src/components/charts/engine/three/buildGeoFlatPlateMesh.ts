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
  capMaterial: THREE.MeshStandardMaterial;
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

  const displacementScale =
    hasTerrain && options.reliefOn && options.terrainDisplacementMap
      ? (options.displacementScale ?? 0)
      : 0;

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

  const invisibleCap = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: isDark ? 0x0a121c : 0x5a6a78,
    roughness: 0.96,
    metalness: 0.02,
  });

  const extrudeGeometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });

  const bodyMesh = new THREE.Mesh(extrudeGeometry, [sideMaterial, invisibleCap]);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;

  const capGeometry = new THREE.ShapeGeometry(shape);
  if (hasTerrain) {
    applyGeoCapBboxUv(capGeometry, options.projBounds!);
  }
  const capMesh = new THREE.Mesh(capGeometry, capMaterial);
  capMesh.position.z = depth + GEO_CAP_Z_EPS;
  capMesh.userData.capMaterial = capMaterial;

  const edges = new THREE.EdgesGeometry(extrudeGeometry, 15);
  const borderLines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: borderColor,
      transparent: true,
      opacity: isDark ? 0.82 : 0.75,
    }),
  );
  borderLines.position.z = depth + GEO_CAP_Z_EPS + 0.01;

  const group = new THREE.Group();
  group.add(bodyMesh);
  group.add(capMesh);
  group.add(borderLines);
  group.userData.capMaterial = capMaterial;

  return { mesh: group, capMaterial, borderLines };
}
