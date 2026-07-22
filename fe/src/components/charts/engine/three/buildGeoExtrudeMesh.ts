import * as THREE from "three";
import { createGeoSideShiftMaterial } from "@/components/charts/engine/three/threeGeoShiftMaterial";

export type GeoExtrudeMesh = {
  mesh: THREE.Mesh;
  sideMaterial: THREE.ShaderMaterial;
  edgeLines: THREE.LineSegments;
};

/** 顶面叠加数据色，保留 sc-datav 灰蓝质感 */
export function blendGeoCapColor(dataColor: number): THREE.Color {
  const base = new THREE.Color(0x3d4f5f);
  const tint = new THREE.Color(dataColor);
  return base.lerp(tint, 0.62);
}

export function buildGeoExtrudeMesh(
  shape: THREE.Shape,
  depth: number,
  capColor: number,
  isDark: boolean,
): GeoExtrudeMesh {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });

  const sideMaterial = createGeoSideShiftMaterial(depth, isDark);
  const capTint = blendGeoCapColor(capColor);
  const capMaterial = new THREE.MeshStandardMaterial({
    color: capTint,
    emissive: capTint,
    emissiveIntensity: 0.72,
    metalness: 0.42,
    roughness: 0.48,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, [sideMaterial, capMaterial]);

  const edges = new THREE.EdgesGeometry(geometry, 12);
  const edgeLines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.72,
    }),
  );
  edgeLines.position.z = depth + 0.04;
  mesh.add(edgeLines);

  return { mesh, sideMaterial, edgeLines };
}
