import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  DEFAULT_SCENE_CLOUD_DENSITY,
  DEFAULT_SCENE_CLOUD_HEIGHT,
  DEFAULT_SCENE_CLOUD_SPEED,
  resolveGeo3dSceneCloudDensity,
  resolveGeo3dSceneCloudHeight,
  resolveGeo3dSceneCloudOptions,
  resolveGeo3dSceneCloudSpeed,
} from "./geo3dSceneCloudStyle";
import { buildGeo3dSceneCloudsWithOptions } from "./geo3dSceneClouds";
import { resolveClusterCount } from "./geo3dSceneCloudClusters";

describe("geo3dSceneCloudStyle", () => {
  it("falls back to defaults for invalid values", () => {
    expect(resolveGeo3dSceneCloudDensity({})).toBe(DEFAULT_SCENE_CLOUD_DENSITY);
    expect(resolveGeo3dSceneCloudSpeed({})).toBe(DEFAULT_SCENE_CLOUD_SPEED);
    expect(resolveGeo3dSceneCloudHeight({})).toBe(DEFAULT_SCENE_CLOUD_HEIGHT);
  });

  it("clamps out-of-range values", () => {
    const options = resolveGeo3dSceneCloudOptions({
      sceneCloudDensity: 2,
      sceneCloudSpeed: -1,
      sceneCloudHeight: 5,
    });
    expect(options.density).toBe(1);
    expect(options.speed).toBe(0);
    expect(options.height).toBe(2);
  });

  it("scales cluster count with density", () => {
    expect(resolveClusterCount(0.2)).toBeLessThan(resolveClusterCount(1));
    const low = buildGeo3dSceneCloudsWithOptions(
      { halfX: 9, halfZ: 6, maxY: 1, defaultDistance: 20 },
      { density: 0.2, speed: 1, height: 1 },
    );
    const high = buildGeo3dSceneCloudsWithOptions(
      { halfX: 9, halfZ: 6, maxY: 1, defaultDistance: 20 },
      { density: 1, speed: 1, height: 1 },
    );
    const lowMesh = low.group.children[0] as THREE.InstancedMesh;
    const highMesh = high.group.children[0] as THREE.InstancedMesh;
    expect(highMesh.count).toBeGreaterThan(lowMesh.count);
    low.dispose();
    high.dispose();
  });
});
