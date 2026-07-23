import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { GeoMapRenderResult } from "@/components/charts/engine/geo/geoMapRenderResult";
import {
  getOfflineGeoMap,
  joinOfflineMapFeatures,
} from "@/components/charts/engine/geo/OfflineGeoPort";
import { colorForGeoHover } from "@/components/charts/engine/geo/geoSurfaceColors";
import { createTooltipLayer, hideTooltip, showMergedTooltip } from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3Theme } from "@/components/charts/engine/d3/core/themeEngine";
import { renderD3ChoroplethChart } from "@/components/charts/engine/d3/geo/renderChoropleth";
import type { D3GeoRenderConfig } from "@/components/charts/engine/d3/types";
import {
  colorForValue,
  geoSurfaceColors,
  geometryToShapes,
} from "@/components/charts/engine/three/geoToThreeShapes";
import { probeWebGL, type WebGLApi } from "@/components/charts/engine/three/webglProbe";
import { buildThreeGeoProject, buildMapFitCollection } from "@/components/charts/engine/three/geo/threeGeoProject";
import { loadChinaTerrainPack } from "@/components/charts/engine/three/geo/chinaTerrainLoader";
import { computeCapTintColor } from "@/components/charts/engine/three/geo/applyGeoTerrainSurface";
import { buildGeoFlatPlateMesh } from "@/components/charts/engine/three/buildGeoFlatPlateMesh";
import { mountThreeGeoVisualMap } from "@/components/charts/engine/three/threeGeoVisualMap";
import {
  configureThreeGeoOrbitControls,
  layoutThreeGeoMapGroup,
  resetThreeGeoOrbitView,
} from "@/components/charts/engine/three/threeGeoOrbit";
import { resolveEmbeddedGeoRoam } from "@/components/charts/engine/geo/geoConstants";
import { DEFAULT_GEO3D_EXTRUDE_INTENSITY } from "@/lib/chartDeStyle";
import { resolveGeo3dQuality, shouldRenderGeo3d } from "@/components/charts/engine/three/geo3dQuality";

const PLATE_DEPTH_RATIO = 0.0028;

function noopDispose(): void {
  /* empty */
}

function showDevTerrainFailureHint(container: HTMLElement): () => void {
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

function logDevTerrainDiagnostics(
  terrainOn: boolean,
  terrainPack: Awaited<ReturnType<typeof loadChinaTerrainPack>> | null,
  firstCap: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined,
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

function attachOrbitGrabCursor(
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

function capMaterialOf(mesh: THREE.Mesh): THREE.MeshBasicMaterial | THREE.MeshStandardMaterial {
  const stored = mesh.userData.capMaterial as THREE.MeshStandardMaterial | undefined;
  if (stored) return stored;
  const mats = mesh.material;
  if (Array.isArray(mats)) return mats[1] as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
  return mats as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) m.dispose();
  mesh.children.forEach((child) => {
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
}

function d3Fallback(
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

export async function renderThreeChoroplethChart(
  container: HTMLElement,
  config: D3GeoRenderConfig,
): Promise<GeoMapRenderResult> {
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
    geo3dStyle = {},
    drillDepth = 0,
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
    const msg = document.createElement("div");
    msg.className =
      "flex h-full items-center justify-center px-3 text-center text-theme-sm text-warning-600 dark:text-warning-400";
    msg.setAttribute("role", "status");
    msg.textContent = "暂无匹配地区数据，请检查维度字段与地图区域是否对应";
    container.appendChild(msg);
    return { dispose: () => container.replaceChildren(), engine: "three" };
  }

  const quality = resolveGeo3dQuality({
    quality: geo3dStyle.quality,
    drillDepth,
    featureCount: features.length,
    shortSide: Math.min(width, height),
  });
  if (!shouldRenderGeo3d(quality)) {
    return d3Fallback(container, config, "quality-degraded");
  }

  const webglProbe = probeWebGL();
  container.dataset.webglApi = webglProbe.api ?? "none";
  if (!webglProbe.ok) {
    return d3Fallback(container, config, "webgl-unavailable");
  }

  try {
    const surface = geoSurfaceColors(isDark);
    const values = features.map((f) => f.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values, 1);
    const plateScale = Math.max(0.35, geo3dStyle.extrudeIntensity ?? DEFAULT_GEO3D_EXTRUDE_INTENSITY);
    const plateDepth = Math.max(0.18, Math.min(width, height) * PLATE_DEPTH_RATIO * plateScale);
    const borderColor = isDark ? 0x7dd3fc : 0x1e40af;
    const showVisualMap = geoStyle.visualMap !== false;
    const terrainTextureOn = geo3dStyle.terrainTexture !== false;
    const terrainReliefOn = geo3dStyle.terrainRelief !== false;
    const terrainOn = terrainTextureOn;
    const reliefOn = terrainTextureOn && terrainReliefOn;

    const fitCollection = buildMapFitCollection(geo);
    const geoProject = buildThreeGeoProject(width, height, fitCollection.features, fitCollection);
    const { project, projBounds, margin, centerX, centerY, viewport } = geoProject;

    let terrainPack: Awaited<ReturnType<typeof loadChinaTerrainPack>> | null = null;
    if (terrainOn) {
      try {
        terrainPack = await loadChinaTerrainPack({ mapId, drillDepth, isDark });
      } catch (err) {
        terrainPack = null;
        if (import.meta.env.DEV) {
          console.warn("[map-3d] terrain pack load failed", err);
        }
      }
    }

    const detachTerrainHint = terrainOn && !terrainPack ? showDevTerrainFailureHint(container) : () => undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    if (!renderer.getContext()) {
      renderer.dispose();
      return d3Fallback(container, config, "webgl-unavailable");
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x9eb4c8, isDark ? 0.48 : 0.38));
    const keyLight = new THREE.DirectionalLight(0xf0f6fc, isDark ? 1.35 : 1.1);
    keyLight.position.set(-1.2, 2.4, 1.0);
    const fillLight = new THREE.DirectionalLight(0x5a8ab0, isDark ? 0.45 : 0.32);
    fillLight.position.set(1.4, 1.2, -0.8);
    scene.add(keyLight, fillLight);

    const mapGroup = new THREE.Group();
    const meshes: THREE.Mesh[] = [];
    const displacementScale = reliefOn ? plateDepth * 5.5 : 0;
    const terrainOpts = terrainPack
      ? {
          terrainColorMap: terrainPack.colorMap,
          terrainNormalMap: terrainPack.normalMap,
          terrainDisplacementMap: terrainPack.displacementMap,
          displacementScale,
          reliefOn,
          geoBounds: terrainPack.bounds,
          projBounds,
          margin,
          centerX,
          centerY,
          projection: geoProject.projection,
          viewport,
        }
      : {};

    let firstCapMaterial: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined;

    for (const feature of features) {
      if (!feature.geometry) continue;
      const shapes = geometryToShapes(feature.geometry, project);
      if (shapes.length === 0) continue;

      const color = colorForValue(feature.value, minVal, maxVal, surface);
      const valueT = maxVal <= minVal ? 1 : (feature.value - minVal) / (maxVal - minVal);
      const capTint = computeCapTintColor(new THREE.Color(color), valueT, isDark);

      for (const shape of shapes) {
        const built = buildGeoFlatPlateMesh(shape, plateDepth, color, borderColor, isDark, {
          ...terrainOpts,
          dataTint: color,
          valueT,
        });
        if (!firstCapMaterial) firstCapMaterial = built.capMaterial;
        built.mesh.userData = {
          name: feature.name,
          value: feature.value,
          adcode: feature.adcode,
          terrainApplied: Boolean(terrainPack?.colorMap),
          capTint,
          capIsBasic: built.capMaterial instanceof THREE.MeshBasicMaterial,
          emissiveIntensity:
            built.capMaterial instanceof THREE.MeshStandardMaterial
              ? built.capMaterial.emissiveIntensity
              : undefined,
        };
        mapGroup.add(built.mesh);
        meshes.push(built.mesh);
      }
    }

    logDevTerrainDiagnostics(terrainOn, terrainPack, firstCapMaterial, mapId, drillDepth, webglProbe.api ?? "none");

    if (meshes.length === 0) {
      renderer.dispose();
      container.replaceChildren();
      const msg = document.createElement("div");
      msg.className =
        "flex h-full items-center justify-center px-3 text-center text-theme-sm text-warning-600 dark:text-warning-400";
      msg.setAttribute("role", "status");
      msg.textContent = "3D 地图几何构建失败，请检查地区维度与 GeoJSON";
      container.appendChild(msg);
      return { dispose: () => container.replaceChildren(), engine: "three" };
    }

    scene.add(mapGroup);
    const orbitLayout = layoutThreeGeoMapGroup(mapGroup, { preCentered: true });

    const roam = resolveEmbeddedGeoRoam(geoStyle.roam);
    const controls = new OrbitControls(camera, renderer.domElement);
    const detachOrbitPan = configureThreeGeoOrbitControls(camera, controls, orbitLayout, roam);
    const detachGrabCursor = attachOrbitGrabCursor(renderer.domElement, controls, roam);

    const onDblClick = () => {
      if (!roam) return;
      resetThreeGeoOrbitView(camera, controls, orbitLayout);
    };
    renderer.domElement.addEventListener("dblclick", onDblClick);

    const tooltip = showTooltip
      ? createTooltipLayer(container, theme as D3Theme, tooltipPresentation)
      : null;
    const detachVisualMap = showVisualMap
      ? mountThreeGeoVisualMap(container, { min: minVal, max: maxVal, surface, valueFormat, isDark })
      : () => undefined;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;
    let frameId = 0;

    const restoreCap = (mesh: THREE.Mesh) => {
      const cap = capMaterialOf(mesh);
      const tint = mesh.userData.capTint as THREE.Color;
      if (cap instanceof THREE.MeshBasicMaterial) {
        cap.color.copy(tint);
        return;
      }
      cap.color.copy(tint);
      cap.emissive.copy(tint);
      cap.emissiveIntensity = mesh.userData.emissiveIntensity as number;
    };

    const setHover = (mesh: THREE.Mesh | null) => {
      if (hovered === mesh) return;
      if (hovered) restoreCap(hovered);
      hovered = mesh;
      if (!hovered) return;
      const cap = capMaterialOf(hovered);
      const hoverCss = colorForGeoHover(
        Number(hovered.userData.value ?? 0),
        minVal,
        maxVal,
        surface.palette,
      );
      const hoverCol = new THREE.Color(hoverCss);
      if (cap instanceof THREE.MeshBasicMaterial) {
        cap.color.copy(hoverCol);
        return;
      }
      cap.color.copy(hoverCol);
      cap.emissive.copy(hoverCol);
      cap.emissiveIntensity = isDark ? 0.45 : 0.32;
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
      showMergedTooltip(
        tooltip,
        container,
        event,
        String(hit.userData.name),
        [{ name: metricField || "值", color: surface.rangeHighCss, value: Number(hit.userData.value ?? 0) }],
        valueFormat,
        width,
      );
    };

    const onClick = () => {
      if (!hovered?.userData?.name || !onPointClick) return;
      onPointClick({
        name: String(hovered.userData.name),
        value: Number(hovered.userData.value ?? 0),
        adcode: hovered.userData.adcode as number | undefined,
      });
    };

    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", () => {
      setHover(null);
      hideTooltip(tooltip);
    });
    renderer.domElement.addEventListener("click", onClick);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return {
      engine: "three",
      webglApi: webglProbe.api ?? "none",
      dispose: () => {
        cancelAnimationFrame(frameId);
        renderer.domElement.removeEventListener("dblclick", onDblClick);
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("click", onClick);
        controls.dispose();
        detachOrbitPan();
        detachGrabCursor();
        detachTerrainHint();
        terrainPack?.dispose();
        for (const mesh of meshes) disposeMesh(mesh);
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

export { webglAvailable } from "@/components/charts/engine/three/webglProbe";
