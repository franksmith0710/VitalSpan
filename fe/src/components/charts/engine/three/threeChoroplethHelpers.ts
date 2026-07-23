import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { GeoMapRenderResult } from "@/components/charts/engine/geo/geoMapRenderResult";
import { renderD3ChoroplethChart } from "@/components/charts/engine/d3/geo/renderChoropleth";
import type { D3GeoRenderConfig } from "@/components/charts/engine/d3/types";
import type { WebGLApi } from "@/components/charts/engine/three/webglProbe";

export function noopDispose(): void {
  /* empty */
}

export function showDevTerrainFailureHint(container: HTMLElement): () => void {
  if (!import.meta.env.DEV) return () => undefined;
  const hint = document.createElement("div");
  hint.className =
    "pointer-events-none absolute bottom-1 left-1 z-10 rounded bg-warning-500/90 px-1.5 py-0.5 text-[10px] text-white";
  hint.setAttribute("role", "status");
  hint.textContent = "地形贴图加载失败，已使用纯色顶面";
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  container.appendChild(hint);
  return () => hint.remove();
}

export function logDevTerrainDiagnostics(
  terrainOn: boolean,
  terrainPack: { level: string; debugUrl?: string } | null,
  firstCap: THREE.MeshStandardMaterial | undefined,
  mapId: string | undefined,
  drillDepth: number,
  webglApi?: WebGLApi | "none",
): void {
  if (!import.meta.env.DEV) return;
  if (terrainOn && !terrainPack) {
    console.warn("[map-3d] terrain pack missing", { mapId, drillDepth, webglApi });
    return;
  }
  if (!terrainPack) return;
  const mapImage = firstCap?.map?.image;
  console.debug("[map-3d] terrain pack loaded", {
    level: terrainPack.level,
    debugUrl: terrainPack.debugUrl,
    capHasMap: Boolean(firstCap?.map),
    capMapImage: mapImage instanceof HTMLImageElement ? `${mapImage.width}x${mapImage.height}` : mapImage,
    webglApi,
    renderEngine: "three",
  });
}

export function attachOrbitGrabCursor(
  domElement: HTMLElement,
  controls: OrbitControls,
  roam: boolean,
): () => void {
  if (!roam) return () => undefined;
  domElement.style.cursor = "grab";
  const onStart = () => {
    domElement.style.cursor = "grabbing";
  };
  const onEnd = () => {
    domElement.style.cursor = "grab";
  };
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);
  return () => {
    controls.removeEventListener("start", onStart);
    controls.removeEventListener("end", onEnd);
    domElement.style.cursor = "";
  };
}

export function provinceGroupOf(obj: THREE.Object3D): THREE.Object3D | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.name != null) return cur;
    cur = cur.parent;
  }
  return null;
}

export function capMaterialOf(target: THREE.Object3D): THREE.MeshStandardMaterial {
  const group = provinceGroupOf(target) ?? target;
  return group.userData.capMaterial as THREE.MeshStandardMaterial;
}

export function disposePlateGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) m.dispose();
    }
  });
}

export function d3Fallback(
  container: HTMLElement,
  config: D3GeoRenderConfig,
  reason: string,
): GeoMapRenderResult {
  container.dataset.webglApi = "none";
  return {
    dispose: renderD3ChoroplethChart(container, config),
    engine: "d3-fallback",
    fallbackReason: reason,
  };
}

export function collectThreeGeoRegionLabelPositions(
  meshes: THREE.Group[],
): Array<{ name: string; position: THREE.Vector3 }> {
  const labels: Array<{ name: string; position: THREE.Vector3 }> = [];
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  for (const mesh of meshes) {
    const name = String(mesh.userData?.name ?? "");
    if (!name) continue;
    box.setFromObject(mesh);
    if (box.isEmpty()) continue;
    box.getCenter(center);
    center.y = box.max.y + 0.08;
    labels.push({ name, position: center.clone() });
  }
  return labels;
}
