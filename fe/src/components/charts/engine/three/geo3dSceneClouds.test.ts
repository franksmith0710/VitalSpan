import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGeo3dSceneClouds, buildGeo3dSceneCloudsWithOptions } from "./geo3dSceneClouds";
import { applyGeo3dSceneClouds, resolveGeo3dSceneClouds, resolveGeo3dVisualStyle } from "./geo3dVisualStyle";

describe("geo3dSceneClouds", () => {
  it("builds horizontal cloud sheets above the map", () => {
    const handle = buildGeo3dSceneClouds({
      halfX: 9,
      halfZ: 6,
      maxY: 1.2,
      defaultDistance: 20,
    });
    expect(handle.group.children.length).toBeGreaterThanOrEqual(2);
    const mesh = handle.group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
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

  it("advances shader time along prevailing wind", () => {
    const handle = buildGeo3dSceneCloudsWithOptions(
      { halfX: 9, halfZ: 6, maxY: 1.2, defaultDistance: 20 },
      { density: 0.5, speed: 1, height: 1 },
    );
    const mesh = handle.group.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial;
    const start = material.uniforms.uTime.value as number;
    handle.update(2);
    expect(material.uniforms.uTime.value as number).toBeGreaterThan(start);
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
