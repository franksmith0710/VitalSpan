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
import {
  releaseWebGLSlot,
  setWebGLSlotDispose,
  tryAcquireWebGLSlot,
  type Geo3dRenderTier,
} from "@/components/charts/engine/three/geo3dRuntime";
import {
  advanceGeoMapDoubleTap,
  isPointerTapMove,
  type GeoMapTapState,
} from "@/components/charts/engine/three/geoMapDoubleTap";

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

function provinceGroupOf(obj: THREE.Object3D): THREE.Object3D | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.name != null) return cur;
    cur = cur.parent;
  }
  return null;
}

function capMaterialOf(target: THREE.Object3D): THREE.MeshStandardMaterial {
  const group = provinceGroupOf(target) ?? target;
  return group.userData.capMaterial as THREE.MeshStandardMaterial;
}

function disposePlateGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) m.dispose();
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
    renderTier = "full",
    instanceKey,
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
    drillDepth,
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
    renderTier: renderTier as Geo3dRenderTier,
  });
  if (!shouldRenderGeo3d(quality)) {
    return d3Fallback(container, config, "quality-degraded");
  }

  const webglSlotKey =
    instanceKey ??
    `geo3d-${mapId ?? "map"}-${String(container.dataset.widgetId ?? (container.id || "anon"))}`;
  let slotReleased = false;
  const releaseSlot = () => {
    if (slotReleased) return;
    slotReleased = true;
    releaseWebGLSlot(webglSlotKey);
  };
  if (!tryAcquireWebGLSlot(webglSlotKey)) {
    return d3Fallback(container, config, "webgl-cap-exceeded");
  }

  const webglProbe = probeWebGL();
  container.dataset.webglApi = webglProbe.api ?? "none";
  if (!webglProbe.ok) {
    releaseSlot();
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
    const { project, projBounds } = geoProject;

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
    const meshes: THREE.Group[] = [];
    const displacementScale = reliefOn ? plateDepth * 5.5 : 0;
    const terrainOpts = terrainPack
      ? {
          terrainColorMap: terrainPack.colorMap,
          terrainNormalMap: terrainPack.normalMap,
          terrainDisplacementMap: terrainPack.displacementMap,
          displacementScale,
          reliefOn,
          projBounds,
          terrainSource: terrainPack.source,
        }
      : {};

    let firstCapMaterial: THREE.MeshStandardMaterial | undefined;

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
          capMaterial: built.capMaterial,
          capTint,
          emissiveIntensity: built.capMaterial.emissiveIntensity,
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

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: THREE.Object3D | null = null;
    let frameId = 0;
    let lastTap: GeoMapTapState = null;
    let pointerDown: { x: number; y: number } | null = null;

    const raycastProvinceGroup = (event: PointerEvent | MouseEvent): THREE.Object3D | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(meshes, true)[0]?.object;
      return hit ? provinceGroupOf(hit) : null;
    };

    const handleMapDoubleActivate = (event: PointerEvent | MouseEvent, group: THREE.Object3D) => {
      if (!group.userData?.name || !onPointClick) return false;
      onPointClick({
        name: String(group.userData.name),
        value: Number(group.userData.value ?? 0),
        adcode: group.userData.adcode as number | undefined,
      });
      event.preventDefault();
      event.stopPropagation();
      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerDown = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const down = pointerDown;
      pointerDown = null;
      if (!down || !isPointerTapMove(down.x, down.y, event.clientX, event.clientY)) {
        lastTap = null;
        return;
      }

      const group = raycastProvinceGroup(event);
      const tapKey = group?.userData?.name ? String(group.userData.name) : "__empty__";
      const { isDouble, next } = advanceGeoMapDoubleTap(lastTap, event.timeStamp, tapKey);
      lastTap = next;
      if (!isDouble) return;

      if (tapKey !== "__empty__" && group) {
        handleMapDoubleActivate(event, group);
        return;
      }

      if (tapKey === "__empty__" && roam) {
        resetThreeGeoOrbitView(camera, controls, orbitLayout);
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.detail !== 2) return;
      const group = raycastProvinceGroup(event);
      if (group?.userData?.name) {
        handleMapDoubleActivate(event, group);
        return;
      }
      if (roam) resetThreeGeoOrbitView(camera, controls, orbitLayout);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("click", onClick);

    const tooltip = showTooltip
      ? createTooltipLayer(container, theme as D3Theme, tooltipPresentation)
      : null;
    const detachVisualMap = showVisualMap
      ? mountThreeGeoVisualMap(container, { min: minVal, max: maxVal, surface, valueFormat, isDark })
      : () => undefined;

    const restoreCap = (group: THREE.Object3D) => {
      const cap = capMaterialOf(group);
      const tint = group.userData.capTint as THREE.Color;
      cap.color.copy(tint);
      cap.emissive.copy(tint);
      cap.emissiveIntensity = group.userData.emissiveIntensity as number;
    };

    const setHover = (group: THREE.Object3D | null) => {
      if (hovered === group) return;
      if (hovered) restoreCap(hovered);
      hovered = group;
      if (!hovered) return;
      const cap = capMaterialOf(hovered);
      const hoverCss = colorForGeoHover(
        Number(hovered.userData.value ?? 0),
        minVal,
        maxVal,
        surface.palette,
      );
      const hoverCol = new THREE.Color(hoverCss);
      cap.color.copy(hoverCol);
      cap.emissive.copy(hoverCol);
      cap.emissiveIntensity = isDark ? 0.45 : 0.32;
    };

    const onMove = (event: PointerEvent) => {
      const group = raycastProvinceGroup(event);
      if (!group?.userData?.name) {
        setHover(null);
        hideTooltip(tooltip);
        return;
      }
      setHover(group);
      if (!tooltip) return;
      showMergedTooltip(
        tooltip,
        container,
        event,
        String(group.userData.name),
        [{ name: metricField || "值", color: surface.rangeHighCss, value: Number(group.userData.value ?? 0) }],
        valueFormat,
        chartWidth,
      );
    };

    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", () => {
      setHover(null);
      hideTooltip(tooltip);
    });

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!animationActive || !visibleInViewport) {
        cancelAnimationFrame(frameId);
        frameId = 0;
        return;
      }
      controls.update();
      renderer.render(scene, camera);
    };

    let animationActive = true;
    let visibleInViewport = true;

    const stopLoop = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const startLoop = () => {
      if (frameId || !animationActive || !visibleInViewport) return;
      animate();
    };

    const updateLoopState = () => {
      if (animationActive && visibleInViewport) startLoop();
      else stopLoop();
    };

    renderer.render(scene, camera);

    const viewportObserver = new IntersectionObserver(
      ([entry]) => {
        visibleInViewport = entry?.isIntersecting ?? false;
        updateLoopState();
      },
      { threshold: 0 },
    );
    viewportObserver.observe(container);
    startLoop();

    let chartWidth = width;
    let chartHeight = height;

    const resize = (nextWidth: number, nextHeight: number) => {
      if (nextWidth <= 0 || nextHeight <= 0) return false;
      chartWidth = nextWidth;
      chartHeight = nextHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(nextWidth, nextHeight);
      return true;
    };

    const disposeImpl = () => {
      viewportObserver.disconnect();
      stopLoop();
      releaseSlot();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("pointermove", onMove);
      controls.dispose();
      detachOrbitPan();
      detachGrabCursor();
      detachTerrainHint();
      terrainPack?.dispose();
      for (const mesh of meshes) disposePlateGroup(mesh);
      renderer.dispose();
      hideTooltip(tooltip);
      detachVisualMap();
      container.replaceChildren();
    };

    setWebGLSlotDispose(webglSlotKey, disposeImpl);

    return {
      engine: "three",
      webglApi: webglProbe.api ?? "none",
      resize,
      setAnimationActive: (active: boolean) => {
        animationActive = active;
        updateLoopState();
      },
      dispose: disposeImpl,
    };
  } catch {
    releaseSlot();
    return d3Fallback(container, config, "three-init-failed");
  }
}

export { webglAvailable } from "@/components/charts/engine/three/webglProbe";
