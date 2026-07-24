import * as THREE from "three";

/** 将世界坐标投影到图表容器内的局部像素坐标（与 tooltip absolute 定位一致） */
export function projectWorldToContainer(
  worldPoint: THREE.Vector3,
  camera: THREE.Camera,
  domElement: HTMLElement,
  container: HTMLElement,
): { x: number; y: number } {
  const ndc = worldPoint.clone().project(camera);
  const domRect = domElement.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: ((ndc.x + 1) / 2) * domRect.width + (domRect.left - containerRect.left),
    y: ((-ndc.y + 1) / 2) * domRect.height + (domRect.top - containerRect.top),
  };
}

/** 将世界坐标投影到视口 client 坐标（配合 position:fixed 的 tooltip） */
export function projectWorldToViewport(
  worldPoint: THREE.Vector3,
  camera: THREE.Camera,
  domElement: HTMLElement,
): { x: number; y: number } {
  const ndc = worldPoint.clone().project(camera);
  const rect = domElement.getBoundingClientRect();
  return {
    x: ((ndc.x + 1) / 2) * rect.width + rect.left,
    y: ((-ndc.y + 1) / 2) * rect.height + rect.top,
  };
}

export function provinceWorldCenter(parts: THREE.Object3D[]): THREE.Vector3 {
  const box = new THREE.Box3();
  for (const part of parts) box.expandByObject(part);
  if (box.isEmpty()) return new THREE.Vector3();
  return box.getCenter(new THREE.Vector3());
}
