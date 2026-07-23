import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

export type ThreeGeoRegionLabel = {
  name: string;
  position: THREE.Vector3;
};

export type ThreeGeoRegionLabelsHandle = {
  render: () => void;
  dispose: () => void;
};

/** 区域名称 CSS2D 标签（与 2D showRegionLabel 对齐） */
export function mountThreeGeoRegionLabels(
  container: HTMLElement,
  camera: THREE.Camera,
  labels: ThreeGeoRegionLabel[],
  isDark: boolean,
): ThreeGeoRegionLabelsHandle {
  const wrapper = document.createElement("div");
  wrapper.className = "pointer-events-none absolute inset-0 z-[2] overflow-hidden";
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  container.appendChild(wrapper);

  const renderer = new CSS2DRenderer();
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.pointerEvents = "none";
  wrapper.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const objects: CSS2DObject[] = [];

  for (const label of labels) {
    const el = document.createElement("span");
    el.className = "map-3d-region-label";
    el.textContent = label.name;
    el.style.color = isDark ? "#e2e8f0" : "#334155";
    el.style.fontSize = "10px";
    el.style.fontWeight = "500";
    el.style.textShadow = isDark ? "0 1px 2px rgba(0,0,0,0.65)" : "0 1px 2px rgba(255,255,255,0.85)";
    el.style.whiteSpace = "nowrap";
    el.style.pointerEvents = "none";
    const obj = new CSS2DObject(el);
    obj.position.copy(label.position);
    scene.add(obj);
    objects.push(obj);
  }

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) renderer.setSize(w, h);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  return {
    render: () => {
      resize();
      renderer.render(scene, camera);
    },
    dispose: () => {
      ro.disconnect();
      for (const obj of objects) {
        obj.removeFromParent();
      }
      wrapper.remove();
    },
  };
}
