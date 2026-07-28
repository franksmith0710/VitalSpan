import * as THREE from "three";
import type { ThreeGeoOrbitLayout } from "@/components/charts/engine/three/threeGeoOrbit";
import {
  applyPlatformRippleShader,
  createPlatformRippleUniforms,
} from "@/components/charts/engine/three/geo3dPlatformRippleMaterial";
import { getPlatformTextures } from "@/components/charts/engine/three/geo3dPlatformTexture";
import type { ResolvedPlatformEffectsStyle } from "@/components/charts/engine/three/geo3dPlatformStyle";

export const GEO3D_PLATFORM_GROUP_NAME = "geo3d-platform-effects";

export type Geo3dPlatformEffectsHandle = {
  group: THREE.Group;
  update: (deltaSec: number) => void;
  dispose: () => void;
};

type RingMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

export function buildGeo3dPlatformEffects(
  layout: Pick<ThreeGeoOrbitLayout, "halfX" | "halfZ" | "minY">,
  resolved: ResolvedPlatformEffectsStyle,
): Geo3dPlatformEffectsHandle {
  const span = Math.max(layout.halfX, layout.halfZ, 4);
  const { colors, layers, ringOpacity, gridOpacity, rippleOpacity, sizeScale, highlightOpacity } =
    resolved;
  const textures = getPlatformTextures();
  const group = new THREE.Group();
  group.name = GEO3D_PLATFORM_GROUP_NAME;
  group.rotation.x = -Math.PI / 2;
  group.position.y = layout.minY - span * 0.02;
  group.renderOrder = -10;

  const highlightSize = span * 3 * sizeScale;
  const ring1Size = span * 2.4 * sizeScale;
  const ring2Size = span * 2.25 * sizeScale;
  const gridSize = span * 28;

  const meshes: THREE.Mesh[] = [];
  let ring1: RingMesh | null = null;
  let ring2: RingMesh | null = null;
  let rippleUniforms: ReturnType<typeof createPlatformRippleUniforms> | null = null;

  if (layers.highlight) {
    const highlight = new THREE.Mesh(
      new THREE.PlaneGeometry(highlightSize, highlightSize),
      new THREE.MeshBasicMaterial({
        map: textures.highlight,
        color: colors.highlight,
        transparent: true,
        opacity: highlightOpacity,
        depthWrite: false,
      }),
    );
    meshes.push(highlight);
  }

  if (layers.rings) {
    ring1 = new THREE.Mesh(
      new THREE.PlaneGeometry(ring1Size, ring1Size),
      new THREE.MeshBasicMaterial({
        map: textures.rotationBorder1,
        color: colors.highlight,
        transparent: true,
        opacity: ringOpacity[0],
        depthWrite: false,
      }),
    );
    ring1.position.z = span * 0.02;
    ring2 = new THREE.Mesh(
      new THREE.PlaneGeometry(ring2Size, ring2Size),
      new THREE.MeshBasicMaterial({
        map: textures.rotationBorder2,
        color: colors.highlight,
        transparent: true,
        opacity: ringOpacity[1],
        depthWrite: false,
      }),
    );
    ring2.position.z = span * 0.02;
    meshes.push(ring1, ring2);
  }

  if (layers.grid) {
    const gridBase = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize, gridSize),
      new THREE.MeshBasicMaterial({
        map: textures.grid,
        alphaMap: textures.gridBlack,
        color: colors.grid,
        transparent: true,
        opacity: gridOpacity,
        depthWrite: false,
      }),
    );
    gridBase.position.z = span * 0.01;
    meshes.push(gridBase);
  }

  if (layers.ripple) {
    rippleUniforms = createPlatformRippleUniforms(colors.ripple);
    const rippleGrid = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize, gridSize),
      new THREE.MeshBasicMaterial({
        map: textures.grid,
        alphaMap: textures.gridBlack,
        color: colors.ripple,
        transparent: true,
        opacity: rippleOpacity,
        depthWrite: false,
      }),
    );
    rippleGrid.position.z = span * 0.01;
    applyPlatformRippleShader(rippleGrid.material, rippleUniforms);
    meshes.push(rippleGrid);
  }

  group.add(...meshes);

  return {
    group,
    update(deltaSec: number) {
      if (deltaSec <= 0) return;
      if (ring1) ring1.rotation.z += 0.001;
      if (ring2) ring2.rotation.z -= 0.004;
      if (rippleUniforms) {
        rippleUniforms.uTime.value += deltaSec * 10;
        if (rippleUniforms.uTime.value > 100) rippleUniforms.uTime.value = 0;
      }
    },
    dispose() {
      group.remove(...meshes);
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}

export function removeGeo3dPlatformEffects(scene: THREE.Scene): void {
  const existing = scene.getObjectByName(GEO3D_PLATFORM_GROUP_NAME);
  if (existing) scene.remove(existing);
}
