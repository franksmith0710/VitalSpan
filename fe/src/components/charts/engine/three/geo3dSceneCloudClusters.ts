import * as THREE from "three";
import type { ResolvedSceneCloudOptions } from "@/components/charts/engine/three/geo3dSceneCloudStyle";
import { createCloudPuffMaterial } from "@/components/charts/engine/three/geo3dSceneCloudPuffMaterial";

export type CloudClusterRuntime = {
  index: number;
  centerX: number;
  centerZ: number;
  baseY: number;
  speedFactor: number;
  puffIndices: number[];
  localOffsets: THREE.Vector3[];
  localScales: THREE.Vector3[];
};

export type CloudClusterBuildResult = {
  instancedMesh: THREE.InstancedMesh;
  clusters: CloudClusterRuntime[];
  sharedGeometry: THREE.SphereGeometry;
  sharedMaterial: THREE.ShaderMaterial;
};

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 0.17) * 43758.5453;
  return x - Math.floor(x);
}

export function resolveClusterCount(density: number): number {
  return Math.round(6 + density * 10);
}

function resolvePuffCount(clusterIndex: number, density: number): number {
  const base = 9 + Math.floor(density * 5);
  return base + (clusterIndex % 2);
}

function composePuffScale(puffRadius: number, aspectSeed: number): THREE.Vector3 {
  const width = 1.05 + aspectSeed * 0.35;
  const flat = 0.24 + aspectSeed * 0.12;
  return new THREE.Vector3(puffRadius * width, puffRadius * flat, puffRadius * (0.9 + aspectSeed * 0.2));
}

export function buildCloudClusterInstances(
  span: number,
  maxY: number,
  options: ResolvedSceneCloudOptions,
): CloudClusterBuildResult {
  const clusterCount = resolveClusterCount(options.density);
  const clusters: CloudClusterRuntime[] = [];
  let puffTotal = 0;

  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    puffTotal += resolvePuffCount(clusterIndex, options.density);
  }

  const sharedGeometry = new THREE.SphereGeometry(1, 8, 8);
  const sharedMaterial = createCloudPuffMaterial({
    opacity: 0.14 + options.density * 0.08,
  });
  const instancedMesh = new THREE.InstancedMesh(sharedGeometry, sharedMaterial, puffTotal);
  instancedMesh.name = "geo3d-cloud-puffs";
  instancedMesh.renderOrder = 20;
  instancedMesh.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let puffIndex = 0;
  const spread = span * 2.1;

  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    const seed = clusterIndex + 1;
    const centerX = (seededUnit(seed * 1.7) - 0.5) * spread;
    const centerZ = (seededUnit(seed * 2.3) - 0.5) * spread;
    const heightT = seededUnit(seed * 3.1);
    const baseY = maxY + span * (0.05 + heightT * 0.1) * options.height;
    const clusterScale = span * (0.055 + seededUnit(seed * 4.9) * 0.035);
    const puffCount = resolvePuffCount(clusterIndex, options.density);
    const puffIndices: number[] = [];
    const localOffsets: THREE.Vector3[] = [];
    const localScales: THREE.Vector3[] = [];

    for (let puff = 0; puff < puffCount; puff += 1) {
      const puffSeed = seed * 17 + puff * 5.3;
      const offset = new THREE.Vector3(
        (seededUnit(puffSeed) - 0.5) * clusterScale * 1.6,
        (seededUnit(puffSeed + 1.1) - 0.5) * clusterScale * 0.35,
        (seededUnit(puffSeed + 2.2) - 0.5) * clusterScale * 1.35,
      );
      const puffRadius = clusterScale * (0.22 + seededUnit(puffSeed + 3.3) * 0.28);
      const puffScale = composePuffScale(puffRadius, seededUnit(puffSeed + 4.4));
      localOffsets.push(offset);
      localScales.push(puffScale);
      puffIndices.push(puffIndex);

      position.set(centerX + offset.x, baseY + offset.y, centerZ + offset.z);
      scale.copy(puffScale);
      matrix.compose(position, quaternion, scale);
      instancedMesh.setMatrixAt(puffIndex, matrix);
      puffIndex += 1;
    }

    clusters.push({
      index: clusterIndex,
      centerX,
      centerZ,
      baseY,
      speedFactor: 0.55 + heightT * 0.65,
      puffIndices,
      localOffsets,
      localScales,
    });
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  return { instancedMesh, clusters, sharedGeometry, sharedMaterial };
}

export function updateCloudClusterMatrices(
  instancedMesh: THREE.InstancedMesh,
  clusters: CloudClusterRuntime[],
): void {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.puffIndices.length; i += 1) {
      const offset = cluster.localOffsets[i];
      const puffScale = cluster.localScales[i];
      position.set(
        cluster.centerX + offset.x,
        cluster.baseY + offset.y,
        cluster.centerZ + offset.z,
      );
      scale.copy(puffScale);
      matrix.compose(position, quaternion, scale);
      instancedMesh.setMatrixAt(cluster.puffIndices[i], matrix);
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}

export function wrapClusterAxis(
  value: number,
  halfExtent: number,
): number {
  const span = halfExtent * 2;
  if (value > halfExtent) return value - span;
  if (value < -halfExtent) return value + span;
  return value;
}
