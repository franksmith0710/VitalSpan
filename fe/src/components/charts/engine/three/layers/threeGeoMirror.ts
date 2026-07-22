import * as THREE from "three";
import type { ThreeGeoOrbitLayout } from "@/components/charts/engine/three/threeGeoOrbit";

/** 对标 sc-datav Mirror：深色高反射地面 */
export function mountThreeGeoMirror(
  scene: THREE.Scene,
  layout: ThreeGeoOrbitLayout,
): () => void {
  const span = Math.max(layout.halfX, layout.halfZ) * 8;
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(span, span),
    new THREE.MeshPhysicalMaterial({
      color: 0x011024,
      metalness: 0.92,
      roughness: 0.12,
      reflectivity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  );
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = -0.02;
  mirror.receiveShadow = true;
  scene.add(mirror);

  return () => {
    mirror.geometry.dispose();
    (mirror.material as THREE.Material).dispose();
    scene.remove(mirror);
  };
}
