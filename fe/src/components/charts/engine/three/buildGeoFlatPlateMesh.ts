import * as THREE from "three";
import type * as d3 from "d3";
import {
  applyTerrainToExtrudeGeometry,
  type GeoMapLayoutMargin,
  type GeoProjBounds,
} from "@/components/charts/engine/three/geo/applyGeoTerrainSurface";
import type { TerrainGeoBounds } from "@/components/charts/engine/three/geo/chinaTerrainLoader";

export type GeoFlatPlateMesh = {
  mesh: THREE.Mesh;
  capMaterial: THREE.MeshStandardMaterial;
  borderLines: THREE.LineSegments;
};

export type GeoFlatPlateOptions = {
  terrainColorMap?: THREE.Texture;
  geoBounds?: TerrainGeoBounds;
  projBounds?: GeoProjBounds;
  margin?: GeoMapLayoutMargin;
  centerX?: number;
  centerY?: number;
  projection?: d3.GeoProjection;
  viewport?: { width: number; height: number };
  dataTint?: number;
  valueT?: number;
};

/** 统一薄底板：hillshade diffuse + 轻 emissive 数据色（暂不启 normal/displacement，避免 Extrude UV 被破坏） */
export function buildGeoFlatPlateMesh(
  shape: THREE.Shape,
  depth: number,
  capColor: number,
  borderColor: number,
  isDark: boolean,
  options: GeoFlatPlateOptions = {},
): GeoFlatPlateMesh {
  let geometry: THREE.ExtrudeGeometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });

  const hasTerrain =
    options.terrainColorMap &&
    options.geoBounds &&
    options.projBounds &&
    options.margin &&
    options.projection &&
    options.viewport &&
    options.centerX != null &&
    options.centerY != null;

  if (hasTerrain) {
    geometry = applyTerrainToExtrudeGeometry(geometry, {
      geoBounds: options.geoBounds!,
      projBounds: options.projBounds!,
      depth,
      projection: options.projection!,
      viewport: options.viewport!,
      margin: options.margin!,
      centerX: options.centerX!,
      centerY: options.centerY!,
    });
  }

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: isDark ? 0x0a121c : 0x5a6a78,
    roughness: 0.96,
    metalness: 0.02,
  });

  const dataTint = new THREE.Color(options.dataTint ?? capColor);
  const valueT = options.valueT ?? 1;
  const capMaterial = new THREE.MeshStandardMaterial({
    map: hasTerrain ? options.terrainColorMap! : null,
    color: hasTerrain ? new THREE.Color(0xffffff) : dataTint,
    emissive: dataTint,
    emissiveIntensity: hasTerrain ? 0.02 + valueT * 0.05 : isDark ? 0.18 : 0.1,
    metalness: hasTerrain ? 0.05 : 0.08,
    roughness: hasTerrain ? 0.72 : 0.65,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, [sideMaterial, capMaterial]);
  mesh.userData.capMaterial = capMaterial;

  const edges = new THREE.EdgesGeometry(geometry, 15);
  const borderLines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: borderColor,
      transparent: true,
      opacity: isDark ? 0.82 : 0.75,
    }),
  );
  borderLines.position.z = depth + 0.02;
  mesh.add(borderLines);

  return { mesh, capMaterial, borderLines };
}
