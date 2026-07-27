import * as THREE from "three";
import type { ThreeGeoOrbitLayout } from "@/components/charts/engine/three/threeGeoOrbit";
import {
  resolveGeo3dSceneCloudOptions,
  type ResolvedSceneCloudOptions,
} from "@/components/charts/engine/three/geo3dSceneCloudStyle";
import { createSceneCloudMaterial } from "@/components/charts/engine/three/geo3dSceneCloudMaterial";
import type { ChartGeo3dStyle } from "@/lib/chartDeStyle";

export const GEO3D_SCENE_CLOUDS_GROUP_NAME = "geo3d-scene-clouds";

/** 盛行风向：自西向东（地图 +X），略带偏北 */
const WIND_DIR = new THREE.Vector2(1, 0.08).normalize();

export type Geo3dSceneCloudsHandle = {
  group: THREE.Group;
  /** @param deltaSec 帧间隔秒数 */
  update: (deltaSec: number) => void;
  dispose: () => void;
};

type CloudSheet = {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  timeRate: number;
};

function resolveLayerCount(density: number): number {
  return Math.round(2 + density * 3);
}

/** 高层云移动更快（高空风），但绝对速度仍保持远景缓慢感 */
function resolveTimeRate(speed: number, layerIndex: number, layerCount: number): number {
  const altitudeFactor = 0.55 + (layerIndex / Math.max(1, layerCount - 1)) * 0.75;
  return 0.045 * speed * altitudeFactor;
}

export function buildGeo3dSceneClouds(
  layout: Pick<ThreeGeoOrbitLayout, "halfX" | "halfZ" | "maxY" | "defaultDistance">,
  geo3dStyle: ChartGeo3dStyle = {},
): Geo3dSceneCloudsHandle {
  return buildGeo3dSceneCloudsWithOptions(layout, resolveGeo3dSceneCloudOptions(geo3dStyle));
}

export function buildGeo3dSceneCloudsWithOptions(
  layout: Pick<ThreeGeoOrbitLayout, "halfX" | "halfZ" | "maxY" | "defaultDistance">,
  options: ResolvedSceneCloudOptions,
): Geo3dSceneCloudsHandle {
  const group = new THREE.Group();
  group.name = GEO3D_SCENE_CLOUDS_GROUP_NAME;
  group.renderOrder = 6;

  const span = Math.max(layout.halfX, layout.halfZ, 4);
  const planeSize = span * 3.8;
  const layerCount = resolveLayerCount(options.density);
  const sheets: CloudSheet[] = [];

  for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
    const layerT = layerIndex / Math.max(1, layerCount - 1);
    const heightLift =
      layout.maxY + span * (0.12 + layerIndex * 0.085) * options.height;
    const opacity = (0.1 + layerT * 0.08) * (0.55 + options.density * 0.65);
    const material = createSceneCloudMaterial(
      {
        opacity: Math.min(0.48, opacity),
        coverage: options.density,
        scale: 0.11 - layerT * 0.028,
        streak: 1.65 + layerT * 0.55,
        phase: layerIndex * 4.7 + options.density * 2.3,
      },
      WIND_DIR,
    );

    const geometry = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = (layerIndex - layerCount * 0.5) * 0.04;
    mesh.position.y = heightLift;
    mesh.renderOrder = 6 + layerIndex;
    group.add(mesh);

    sheets.push({
      mesh,
      material,
      timeRate: resolveTimeRate(options.speed, layerIndex, layerCount),
    });
  }

  return {
    group,
    update(deltaSec: number) {
      if (deltaSec <= 0) return;
      for (const sheet of sheets) {
        const uniform = sheet.material.uniforms.uTime;
        if (!uniform) continue;
        uniform.value += sheet.timeRate * deltaSec;
      }
    },
    dispose() {
      for (const sheet of sheets) {
        sheet.mesh.geometry.dispose();
        sheet.material.dispose();
        group.remove(sheet.mesh);
      }
      sheets.length = 0;
    },
  };
}

export function removeGeo3dSceneClouds(scene: THREE.Scene): void {
  scene.fog = null;
  const existing = scene.getObjectByName(GEO3D_SCENE_CLOUDS_GROUP_NAME);
  if (existing) scene.remove(existing);
}
