import * as THREE from "three";
import type { Geo3dStylePreset } from "@/components/charts/engine/three/geo3dVisualStyle";
import type { ThreeGeoOrbitLayout } from "@/components/charts/engine/three/threeGeoOrbit";
import {
  applyPlatformRippleShader,
  createPlatformRippleUniforms,
} from "@/components/charts/engine/three/geo3dPlatformRippleMaterial";
import { getPlatformTextures } from "@/components/charts/engine/three/geo3dPlatformTexture";

export const GEO3D_PLATFORM_GROUP_NAME = "geo3d-platform-effects";

export type PlatformAccentColors = {
  highlight: string;
  grid: string;
  ripple: string;
};

export function resolvePlatformAccentColors(preset: Geo3dStylePreset, isDark: boolean): PlatformAccentColors {
  if (preset === "classic") {
    return { highlight: "#fbdf88", grid: "#fbdf88", ripple: "#ea580c" };
  }
  if (preset === "tech") {
    return isDark
      ? { highlight: "#7dd3fc", grid: "#38bdf8", ripple: "#0ea5e9" }
      : { highlight: "#bae6fd", grid: "#38bdf8", ripple: "#0284c7" };
  }
  if (preset === "minimal") {
    return isDark
      ? { highlight: "#64748b", grid: "#475569", ripple: "#94a3b8" }
      : { highlight: "#cbd5e1", grid: "#94a3b8", ripple: "#64748b" };
  }
  return isDark
    ? { highlight: "#93c5fd", grid: "#60a5fa", ripple: "#3b82f6" }
    : { highlight: "#dbeafe", grid: "#60a5fa", ripple: "#2563eb" };
}

export type Geo3dPlatformEffectsHandle = {
  group: THREE.Group;
  update: (deltaSec: number) => void;
  dispose: () => void;
};

type RingMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

export function buildGeo3dPlatformEffects(
  layout: Pick<ThreeGeoOrbitLayout, "halfX" | "halfZ" | "minY">,
  preset: Geo3dStylePreset,
  isDark: boolean,
): Geo3dPlatformEffectsHandle {
  const span = Math.max(layout.halfX, layout.halfZ, 4);
  const colors = resolvePlatformAccentColors(preset, isDark);
  const textures = getPlatformTextures();
  const group = new THREE.Group();
  group.name = GEO3D_PLATFORM_GROUP_NAME;
  group.rotation.x = -Math.PI / 2;
  group.position.y = layout.minY - span * 0.02;
  group.renderOrder = -10;

  const highlight = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 8, span * 8),
    new THREE.MeshBasicMaterial({
      map: textures.highlight,
      color: colors.highlight,
      transparent: true,
      depthWrite: false,
    }),
  );
  const ring1: RingMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 6.5, span * 6.5),
    new THREE.MeshBasicMaterial({
      map: textures.rotationBorder1,
      color: colors.highlight,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  ring1.position.z = span * 0.02;
  const ring2: RingMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 6.1, span * 6.1),
    new THREE.MeshBasicMaterial({
      map: textures.rotationBorder2,
      color: colors.highlight,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  ring2.position.z = span * 0.02;

  const gridBase = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 28, span * 28),
    new THREE.MeshBasicMaterial({
      map: textures.grid,
      alphaMap: textures.gridBlack,
      color: colors.grid,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    }),
  );
  gridBase.position.z = span * 0.01;

  const rippleUniforms = createPlatformRippleUniforms(colors.ripple);
  const rippleGrid = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 28, span * 28),
    new THREE.MeshBasicMaterial({
      map: textures.grid,
      alphaMap: textures.gridBlack,
      color: colors.ripple,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  rippleGrid.position.z = span * 0.01;
  applyPlatformRippleShader(rippleGrid.material, rippleUniforms);

  group.add(highlight, ring1, ring2, gridBase, rippleGrid);

  return {
    group,
    update(deltaSec: number) {
      if (deltaSec <= 0) return;
      ring1.rotation.z += 0.001;
      ring2.rotation.z -= 0.004;
      rippleUniforms.uTime.value += deltaSec * 10;
      if (rippleUniforms.uTime.value > 100) rippleUniforms.uTime.value = 0;
    },
    dispose() {
      group.remove(highlight, ring1, ring2, gridBase, rippleGrid);
      highlight.geometry.dispose();
      ring1.geometry.dispose();
      ring2.geometry.dispose();
      gridBase.geometry.dispose();
      rippleGrid.geometry.dispose();
      highlight.material.dispose();
      ring1.material.dispose();
      ring2.material.dispose();
      gridBase.material.dispose();
      rippleGrid.material.dispose();
    },
  };
}

export function removeGeo3dPlatformEffects(scene: THREE.Scene): void {
  const existing = scene.getObjectByName(GEO3D_PLATFORM_GROUP_NAME);
  if (existing) scene.remove(existing);
}
