import * as d3 from "d3";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  getOfflineGeoMap,
  joinOfflineMapFeatures,
} from "@/components/charts/engine/geo/OfflineGeoPort";
import { createTooltipLayer, hideTooltip, showMergedTooltip } from "@/components/charts/engine/d3/core/tooltipLayer";
import { renderD3ChoroplethChart } from "@/components/charts/engine/d3/geo/renderChoropleth";
import type { D3GeoRenderConfig } from "@/components/charts/engine/d3/types";

type SurfaceColors = { emptyFill: number; rangeLow: number; rangeHigh: number };

function geoSurfaceColors(isDark: boolean): SurfaceColors {
  return {
    emptyFill: isDark ? 0x334155 : 0xe8edf3,
    rangeLow: isDark ? 0x0c4a6e : 0xe0f2fe,
    rangeHigh: isDark ? 0x38bdf8 : 0x1653a9,
  };
}

function colorForValue(value: number, min: number, max: number, surface: SurfaceColors): number {
  if (!Number.isFinite(value) || value <= 0) return surface.emptyFill;
  if (max <= 0) return surface.emptyFill;
  const t = max <= min ? 1 : (value - min) / (max - min);
  const low = new THREE.Color(surface.rangeLow);
  const high = new THREE.Color(surface.rangeHigh);
  return low.lerp(high, Math.max(0, Math.min(1, t))).getHex();
}

type ProjectFn = (coord: [number, number]) => [number, number] | null;

function traceRing(path: THREE.Path, ring: [number, number][], project: ProjectFn): void {
  let started = false;
  for (const coord of ring) {
    const p = project(coord);
    if (!p) continue;
    if (!started) {
      path.moveTo(p[0], p[1]);
      started = true;
    } else {
      path.lineTo(p[0], p[1]);
    }
  }
}

function geometryToShapes(geometry: GeoJSON.Geometry, project: ProjectFn): THREE.Shape[] {
  if (geometry.type === "Polygon") {
    const shape = new THREE.Shape();
    geometry.coordinates.forEach((ring, index) => {
      if (index === 0) traceRing(shape, ring as [number, number][], project);
      else {
        const hole = new THREE.Path();
        traceRing(hole, ring as [number, number][], project);
        shape.holes.push(hole);
      }
    });
    return shape.curves.length > 0 ? [shape] : [];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((poly) =>
      geometryToShapes({ type: "Polygon", coordinates: poly }, project),
    );
  }
  return [];
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return Boolean(ctx);
  } catch {
    return false;
  }
}

export function renderThreeChoroplethChart(container: HTMLElement, config: D3GeoRenderConfig): () => void {
  const {
    width,
    height,
    rows,
    columns,
    regionField,
    metricField,
    showTooltip,
    valueFormat,
    knownRegionNames,
    mapId,
    isDark = false,
    geoStyle = {},
    onPointClick,
  } = config;

  if (width <= 0 || height <= 0) {
    container.replaceChildren();
    return () => undefined;
  }

  const geo = getOfflineGeoMap(mapId ?? "");
  if (!geo?.features?.length) {
    container.replaceChildren();
    const msg = document.createElement("div");
    msg.className =
      "flex h-full items-center justify-center px-3 text-center text-theme-sm text-error-600 dark:text-error-400";
    msg.setAttribute("role", "alert");
    msg.textContent = "离线地图资产缺失，无法渲染";
    container.appendChild(msg);
    return () => container.replaceChildren();
  }

  const features = joinOfflineMapFeatures(
    rows,
    columns,
    regionField,
    metricField,
    mapId ?? "",
    knownRegionNames,
  ).filter((f) => f.geometry != null);

  container.replaceChildren();

  if (features.length === 0) {
    return () => undefined;
  }

  if (!webglAvailable()) {
    return renderD3ChoroplethChart(container, config);
  }

  try {
  const surface = geoSurfaceColors(isDark);
  const values = features.map((f) => f.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values, 1);
  const maxExtrude = Math.min(width, height) * 0.12;

  const featureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: features.map((f) => ({
      type: "Feature",
      properties: { name: f.name, value: f.value },
      geometry: f.geometry!,
    })),
  };

  const projection = d3.geoMercator().fitSize([width * 0.88, height * 0.88], featureCollection);
  const project: ProjectFn = (coord) => {
    const p = projection(coord);
    return p ? [p[0] - width / 2, -(p[1] - height / 2)] : null;
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(isDark ? 0x0f172a : 0xf8fafc);

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 5000);
  camera.position.set(0, -height * 0.85, height * 0.72);

  let renderer: THREE.WebGLRenderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  keyLight.position.set(-1, -1.2, 2);
  const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
  fillLight.position.set(1.5, 0.5, 1);
  scene.add(ambient, keyLight, fillLight);

  const mapGroup = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const meshByName = new Map<string, THREE.Mesh>();

  for (const feature of features) {
    if (!feature.geometry) continue;
    const shapes = geometryToShapes(feature.geometry, project);
    if (shapes.length === 0) continue;

    const depth = feature.value > 0
      ? 1 + (maxExtrude * (maxVal <= minVal ? 1 : (feature.value - minVal) / (maxVal - minVal)))
      : 0.6;
    const color = colorForValue(feature.value, minVal, maxVal, surface);

    for (const shape of shapes) {
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.4,
        bevelSize: 0.3,
        bevelSegments: 1,
      });
      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.08,
        roughness: 0.72,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData = { name: feature.name, value: feature.value };
      mapGroup.add(mesh);
      meshes.push(mesh);
      meshByName.set(feature.name, mesh);
    }
  }

  const box = new THREE.Box3().setFromObject(mapGroup);
  const center = box.getCenter(new THREE.Vector3());
  mapGroup.position.sub(center);
  scene.add(mapGroup);

  mapGroup.rotation.x = -Math.PI / 2;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = geoStyle.roam !== false;
  controls.enableZoom = geoStyle.roam !== false;
  controls.enableRotate = geoStyle.roam !== false;
  controls.minDistance = height * 0.35;
  controls.maxDistance = height * 3;
  controls.target.set(0, 0, maxExtrude * 0.4);
  controls.update();

  const tooltip = showTooltip ? createTooltipLayer(container) : null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: THREE.Mesh | null = null;
  let frameId = 0;

  const setHover = (mesh: THREE.Mesh | null) => {
    if (hovered === mesh) return;
    if (hovered) {
      const mat = hovered.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x000000);
    }
    hovered = mesh;
    if (hovered) {
      const mat = hovered.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(isDark ? 0x1e3a5f : 0xbfdbfe);
    }
  };

  const onMove = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0]?.object as THREE.Mesh | undefined;
    if (!hit?.userData?.name) {
      setHover(null);
      hideTooltip(tooltip);
      return;
    }
    setHover(hit);
    if (!tooltip) return;
    const name = String(hit.userData.name);
    const value = Number(hit.userData.value ?? 0);
    showMergedTooltip(
      tooltip,
      container,
      event,
      name,
      [{ name: metricField || "值", color: "#1653a9", value }],
      valueFormat,
      width,
    );
  };

  const onLeave = () => {
    setHover(null);
    hideTooltip(tooltip);
  };

  const onClick = () => {
    if (!hovered?.userData?.name || !onPointClick) return;
    const name = String(hovered.userData.name);
    onPointClick({ name, value: Number(hovered.userData.value ?? 0) });
  };

  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerleave", onLeave);
  renderer.domElement.addEventListener("click", onClick);

  const animate = () => {
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(frameId);
    renderer.domElement.removeEventListener("pointermove", onMove);
    renderer.domElement.removeEventListener("pointerleave", onLeave);
    renderer.domElement.removeEventListener("click", onClick);
    controls.dispose();
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    renderer.dispose();
    hideTooltip(tooltip);
    container.replaceChildren();
    meshByName.clear();
  };
  } catch {
    return renderD3ChoroplethChart(container, config);
  }
}
