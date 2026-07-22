import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GEO_MAP_SCALE_LIMIT } from "@/components/charts/engine/geo/geoConstants";

export type ThreeGeoOrbitLayout = {
  size: THREE.Vector3;
  defaultDistance: number;
  minDistance: number;
  maxDistance: number;
  halfX: number;
  halfZ: number;
  maxY: number;
  minY: number;
  target: THREE.Vector3;
};

const GEO_MAP_TARGET_SPAN = 18;

/** 仅用 Mesh 算包围盒，排除 LineSegments 边线对质心的拉扯 */
function boundsFromMapMeshes(mapGroup: THREE.Group): THREE.Box3 {
  const box = new THREE.Box3();
  let hasMesh = false;
  mapGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const meshBox = new THREE.Box3().setFromObject(obj);
    if (meshBox.isEmpty()) return;
    if (!hasMesh) {
      box.copy(meshBox);
      hasMesh = true;
    } else {
      box.union(meshBox);
    }
  });
  if (!hasMesh) box.setFromObject(mapGroup);
  return box;
}

/** 将挤出地图躺平（XZ 平面）、居中并缩放到可 orbit 的合理尺度 */
export function layoutThreeGeoMapGroup(mapGroup: THREE.Group): ThreeGeoOrbitLayout {
  mapGroup.rotation.x = -Math.PI / 2;
  mapGroup.updateMatrixWorld(true);

  const box = boundsFromMapMeshes(mapGroup);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  mapGroup.position.sub(center);
  mapGroup.updateMatrixWorld(true);

  let halfX = Math.max(size.x * 0.5, 0.5);
  let halfZ = Math.max(size.z * 0.5, 0.5);
  const span = Math.max(halfX, halfZ);
  const normalize = span > 0 ? (GEO_MAP_TARGET_SPAN / span) * 0.5 : 0.5;
  mapGroup.scale.multiplyScalar(normalize);
  mapGroup.updateMatrixWorld(true);

  const scaledBox = boundsFromMapMeshes(mapGroup);
  const scaledSize = scaledBox.getSize(new THREE.Vector3());
  halfX = Math.max(scaledSize.x * 0.5, 0.5);
  halfZ = Math.max(scaledSize.z * 0.5, 0.5);
  const halfY = Math.max(scaledSize.y * 0.5, 0.08);
  const radius = Math.max(halfX, halfZ);
  const defaultDistance = Math.max(radius * 2.35, 14);

  return {
    size: scaledSize,
    defaultDistance,
    minDistance: defaultDistance / GEO_MAP_SCALE_LIMIT.max,
    maxDistance: defaultDistance / GEO_MAP_SCALE_LIMIT.min,
    halfX,
    halfZ,
    maxY: halfY,
    minY: -halfY,
    target: new THREE.Vector3(0, 0, 0),
  };
}

/** sc-datav Demo1/Demo2：缩放到 ~16 单位，雾效与相机可复用 */
export function layoutDatavMapGroup(mapGroup: THREE.Group): ThreeGeoOrbitLayout {
  mapGroup.rotation.x = -Math.PI / 2;
  mapGroup.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(mapGroup);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  mapGroup.position.sub(center);
  mapGroup.updateMatrixWorld(true);

  let halfX = Math.max(size.x * 0.5, 0.5);
  let halfZ = Math.max(size.z * 0.5, 0.5);
  let maxY = Math.max(size.y, 0.2);

  const targetSpan = 16;
  const span = Math.max(halfX, halfZ);
  const normalize = span > 0 ? (targetSpan / span) * 0.5 : 0.5;
  mapGroup.scale.multiplyScalar(normalize);
  mapGroup.position.y = 0.2;
  mapGroup.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(mapGroup);
  const scaledSize = scaledBox.getSize(new THREE.Vector3());
  halfX = Math.max(scaledSize.x * 0.5, 0.5);
  halfZ = Math.max(scaledSize.z * 0.5, 0.5);
  const halfY = Math.max(scaledSize.y * 0.5, 0.1);

  return {
    size: scaledSize,
    defaultDistance: 18,
    minDistance: 8,
    maxDistance: 24,
    halfX,
    halfZ,
    maxY: halfY,
    minY: -halfY,
    target: new THREE.Vector3(0, 0, 0),
  };
}

export function configureThreeGeoOrbitControls(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  layout: ThreeGeoOrbitLayout,
  roam: boolean,
): () => void {
  controls.target.copy(layout.target);
  controls.screenSpacePanning = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.minDistance = layout.minDistance;
  controls.maxDistance = layout.maxDistance;
  controls.enablePan = roam;
  controls.enableZoom = roam;
  controls.enableRotate = roam;

  const azimuth = -Math.PI / 6;
  const polar = 0.42;
  const d = layout.defaultDistance;
  const { target } = layout;
  camera.position.set(
    target.x + d * Math.sin(polar) * Math.sin(azimuth),
    target.y + d * Math.cos(polar),
    target.z + d * Math.sin(polar) * Math.cos(azimuth),
  );
  camera.lookAt(target);

  const clampPan = () => {
    if (!roam) return;
    const dist = camera.position.distanceTo(controls.target);
    const zoomRatio = layout.defaultDistance / Math.max(dist, layout.minDistance);
    const panScale = THREE.MathUtils.clamp(zoomRatio, 1, GEO_MAP_SCALE_LIMIT.max);
    const maxPanX = layout.halfX * 0.88 * panScale;
    const maxPanZ = layout.halfZ * 0.88 * panScale;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -maxPanX, maxPanX);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -maxPanZ, maxPanZ);
    controls.target.y = THREE.MathUtils.clamp(
      controls.target.y,
      layout.minY,
      layout.maxY,
    );
  };

  controls.addEventListener("change", clampPan);
  controls.update();
  clampPan();

  return () => controls.removeEventListener("change", clampPan);
}

export function resetThreeGeoOrbitView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  layout: ThreeGeoOrbitLayout,
): void {
  controls.target.copy(layout.target);
  const azimuth = -Math.PI / 6;
  const polar = 0.42;
  const d = layout.defaultDistance;
  const { target } = layout;
  camera.position.set(
    target.x + d * Math.sin(polar) * Math.sin(azimuth),
    target.y + d * Math.cos(polar),
    target.z + d * Math.sin(polar) * Math.cos(azimuth),
  );
  camera.lookAt(target);
  controls.update();
}
