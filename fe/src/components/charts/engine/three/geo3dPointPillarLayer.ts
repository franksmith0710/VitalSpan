import * as THREE from "three";
import type { RegionPointSample } from "@/components/charts/engine/three/geo3dRegionCentroid";
import {
  buildGeo3dPointPillar,
  resolvePillarHeight,
  type Geo3dPointPillar,
} from "@/components/charts/engine/three/geo3dPointPillar";
import { resolveRegionCapAnchorLocal } from "@/components/charts/engine/three/geo3dRegionCentroid";
import type { ResolvedPointEffectsStyle } from "@/components/charts/engine/three/geo3dPointEffectsStyle";

export type Geo3dPointPillarLayerHandle = {
  group: THREE.Group;
  pillars: Array<{ name: string; pillar: Geo3dPointPillar; baseZ: number }>;
  update: (deltaSec: number, reducedMotion: boolean) => void;
  dispose: () => void;
};

export function buildGeo3dPointPillarLayer(
  samples: RegionPointSample[],
  meshes: THREE.Object3D[],
  capTopZ: number,
  span: number,
  style: ResolvedPointEffectsStyle,
): Geo3dPointPillarLayerHandle | null {
  if (!style.layers.pointPillar || samples.length === 0) return null;
  const group = new THREE.Group();
  group.name = "geo3d-point-pillars";
  const pillars: Geo3dPointPillarLayerHandle["pillars"] = [];

  for (const sample of samples) {
    const barHeight = resolvePillarHeight(sample.valueT, span, style);
    const pillar = buildGeo3dPointPillar(barHeight, style, span);
    const anchor = resolveRegionCapAnchorLocal(meshes, sample.name, capTopZ);
    pillar.group.position.set(anchor?.x ?? sample.x, anchor?.y ?? sample.y, capTopZ);
    pillar.group.renderOrder = 15;
    group.add(pillar.group);
    pillars.push({ name: sample.name, pillar, baseZ: capTopZ });
  }

  return {
    group,
    pillars,
    update(deltaSec, reducedMotion) {
      if (deltaSec <= 0 || reducedMotion) return;
      for (const entry of pillars) {
        entry.pillar.ringMesh.rotation.z += (deltaSec + 0.02) * style.pointPillarRingSpeed;
      }
    },
    dispose() {
      for (const entry of pillars) entry.pillar.dispose();
      group.clear();
    },
  };
}
