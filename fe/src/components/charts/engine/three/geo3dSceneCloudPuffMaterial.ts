import * as THREE from "three";

export type CloudPuffMaterialOptions = {
  opacity: number;
  color?: THREE.ColorRepresentation;
};

/**
 * InstancedMesh 使用内置材质，避免自定义 shader 与 Three 注入的 instanceMatrix 冲突。
 */
export function createCloudPuffMaterial(options: CloudPuffMaterialOptions): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: options.color ?? 0xf0f6ff,
    transparent: true,
    opacity: options.opacity,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}
