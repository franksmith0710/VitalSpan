import * as d3 from "d3";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { GeoMapRenderResult } from "@/components/charts/engine/geo/geoMapRenderResult";
import {
  getOfflineGeoMap,
  joinOfflineMapFeatures,
} from "@/components/charts/engine/geo/OfflineGeoPort";
import { createTooltipLayer, hideTooltip, showMergedTooltip } from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3Theme } from "@/components/charts/engine/d3/core/themeEngine";
import { renderD3ChoroplethChart } from "@/components/charts/engine/d3/geo/renderChoropleth";
import type { D3GeoRenderConfig } from "@/components/charts/engine/d3/types";
import {
  colorForValue,
  geoSurfaceColors,
  geometryToShapes,
  webglAvailable,
} from "@/components/charts/engine/three/geoToThreeShapes";
import { mountThreeGeoVisualMap } from "@/components/charts/engine/three/threeGeoVisualMap";
import {
  configureThreeGeoOrbitControls,
  layoutThreeGeoMapGroup,
  resetThreeGeoOrbitView,
} from "@/components/charts/engine/three/threeGeoOrbit";
import { resolveEmbeddedGeoRoam } from "@/components/charts/engine/geo/geoConstants";

type ProjectFn = (coord: [number, number]) => [number, number] | null;

function noopDispose(): void {
  /* empty */
}

function d3Fallback(
  container: HTMLElement,
  config: D3GeoRenderConfig,
  reason: string,
): GeoMapRenderResult {
  return {
    dispose: renderD3ChoroplethChart(container, config),
    engine: "d3-fallback",
    fallbackReason: reason,
  };
}

export function renderThreeChoroplethChart(
  container: HTMLElement,
  config: D3GeoRenderConfig,
): GeoMapRenderResult {
  const {
    width,
    height,
    rows,
    columns,
    regionField,
    metricField,
    theme,
    showTooltip,
    tooltipPresentation,
    valueFormat,
    knownRegionNames,
    mapId,
    isDark = false,
    geoStyle = {},
    onPointClick,
  } = config;

  if (width <= 0 || height <= 0) {
    container.replaceChildren();
    return { dispose: noopDispose, engine: "three" };
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
    return { dispose: () => container.replaceChildren(), engine: "three" };
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
    return { dispose: noopDispose, engine: "three" };
  }

  if (!webglAvailable()) {
    return d3Fallback(container, config, "webgl-unavailable");
  }

  try {
    const surface = geoSurfaceColors(isDark);
    const values = features.map((f) => f.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values, 1);
    const maxExtrude = Math.min(width, height) * 0.12;
    const showVisualMap = geoStyle.visualMap !== false;

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

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
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

    for (const feature of features) {
      if (!feature.geometry) continue;
      const shapes = geometryToShapes(feature.geometry, project);
      if (shapes.length === 0) continue;

      const depth =
        feature.value > 0
          ? 1 + maxExtrude * (maxVal <= minVal ? 1 : (feature.value - minVal) / (maxVal - minVal))
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
      }
    }

    scene.add(mapGroup);
    const orbitLayout = layoutThreeGeoMapGroup(mapGroup);
    const roam = resolveEmbeddedGeoRoam(geoStyle.roam);

    const controls = new OrbitControls(camera, renderer.domElement);
    const detachOrbitPan = configureThreeGeoOrbitControls(camera, controls, orbitLayout, roam);

    const onDblClick = () => {
      if (!roam) return;
      resetThreeGeoOrbitView(camera, controls, orbitLayout);
    };
    renderer.domElement.addEventListener("dblclick", onDblClick);

    const tooltip = showTooltip
      ? createTooltipLayer(container, theme as D3Theme, tooltipPresentation)
      : null;
    let detachVisualMap = showVisualMap
      ? mountThreeGeoVisualMap(container, {
          min: minVal,
          max: maxVal,
          surface,
          valueFormat,
          isDark,
        })
      : () => undefined;

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
        [{ name: metricField || "值", color: surface.rangeHighCss, value }],
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

    return {
      engine: "three",
      dispose: () => {
        cancelAnimationFrame(frameId);
        renderer.domElement.removeEventListener("dblclick", onDblClick);
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        renderer.domElement.removeEventListener("click", onClick);
        controls.dispose();
        detachOrbitPan();
        for (const mesh of meshes) {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
        renderer.dispose();
        hideTooltip(tooltip);
        detachVisualMap();
        container.replaceChildren();
      },
    };
  } catch {
    return d3Fallback(container, config, "three-init-failed");
  }
}

export { webglAvailable } from "@/components/charts/engine/three/geoToThreeShapes";
