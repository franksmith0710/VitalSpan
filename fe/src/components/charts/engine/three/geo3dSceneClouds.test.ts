import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGeo3dSceneClouds, buildGeo3dSceneCloudsWithOptions } from "./geo3dSceneClouds";
import { resolveClusterCount } from "./geo3dSceneCloudClusters";
import { applyGeo3dSceneClouds, resolveGeo3dSceneClouds, resolveGeo3dVisualStyle } from "./geo3dVisualStyle";

describe("geo3dSceneClouds", () => {
  it("builds volumetric cloud clusters above the map", () => {
    const handle = buildGeo3dSceneClouds({
      halfX: 9,
      halfZ: 6,
      maxY: 1.2,
      defaultDistance: 20,
    });
    expect(handle.group.children.length).toBe(1);
    const instanced = handle.group.children[0] as THREE.InstancedMesh;
    expect(instanced).toBeInstanceOf(THREE.InstancedMesh);
    const material = instanced.material as THREE.MeshBasicMaterial;
    expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(material.opacity).toBeGreaterThan(0.1);
    expect(instanced.count).toBeGreaterThanOrEqual(resolveClusterCount(0.55) * 5);
    handle.dispose();
  });

  it("applyGeo3dSceneClouds mounts clouds and clears linear fog", () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 10);
    const visual = resolveGeo3dVisualStyle({ stylePreset: "tech" }, true);
    const handle = applyGeo3dSceneClouds(
      scene,
      { halfX: 9, halfZ: 6, maxY: 1.2, defaultDistance: 20 },
      visual,
    );
    expect(handle).not.toBeNull();
    expect(scene.fog).toBeNull();
    expect(scene.children.some((child) => child.name === "geo3d-scene-clouds")).toBe(true);
    handle?.dispose();
  });

  it("drifts cluster centers along prevailing wind", () => {
    const handle = buildGeo3dSceneCloudsWithOptions(
      { halfX: 9, halfZ: 6, maxY: 1.2, defaultDistance: 20 },
      { density: 0.5, speed: 1, height: 1 },
    );
    const instanced = handle.group.children[0] as THREE.InstancedMesh;
    const matrixBefore = new THREE.Matrix4();
    instanced.getMatrixAt(0, matrixBefore);
    const posBefore = new THREE.Vector3().setFromMatrixPosition(matrixBefore);
    handle.update(3);
    const matrixAfter = new THREE.Matrix4();
    instanced.getMatrixAt(0, matrixAfter);
    const posAfter = new THREE.Vector3().setFromMatrixPosition(matrixAfter);
    expect(posAfter.x).toBeGreaterThan(posBefore.x);
    handle.dispose();
  });

  it("applyGeo3dSceneClouds removes clouds when disabled", () => {
    const scene = new THREE.Scene();
    const visual = resolveGeo3dVisualStyle({ stylePreset: "tech", sceneFog: false }, true);
    expect(resolveGeo3dSceneClouds({ stylePreset: "tech", sceneFog: false })).toBe(false);
    const handle = applyGeo3dSceneClouds(
      scene,
      { halfX: 9, halfZ: 6, maxY: 1.2, defaultDistance: 20 },
      visual,
    );
    expect(handle).toBeNull();
    expect(scene.children).toHaveLength(0);
  });
});
