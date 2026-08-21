import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildGisOverlayGeoJson } from "@/components/charts/engine/maplibre/gisMapOverlay";
import { readGisProject, resolveGisRenderableBasemap, DEFAULT_GIS_GLOBE_VIEW } from "@/components/charts/engine/maplibre/gisProject";
import { applyBasemapRuntimePatch } from "@/components/charts/engine/maplibre/gisBasemapPalette";
import {
  appendGisOverlayLayers,
  buildPmtilesStyle,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import { applyGisGlobeToStyle, spaceBackdropForPreset } from "@/components/charts/engine/maplibre/gisAtmosphereSky";
import {
  applyGlobeAtmosphere,
  applyGisMapStylePreservingCamera,
  buildGisConfiguredViewKey,
  mountGisMapControls,
  REAL_EARTH_ROTATION_DEG_PER_SEC,
  GLOBE_IDLE_ROTATION_DEG_PER_SEC,
  startGisGlobeAutoRotate,
  syncGisMapView,
} from "@/components/charts/engine/maplibre/gisMapRuntime";
import { mountGisGlobeHaloOverlay } from "@/components/charts/engine/maplibre/gisGlobeHalo";
import { mountGisStarfieldOverlay } from "@/components/charts/engine/maplibre/gisStarfield";
import { registerGisMapViewLiveControl } from "@/components/charts/engine/maplibre/gisMapViewBridge";
import {
  ensurePmtilesArchiveRegistered,
  loadMapLibreRuntime,
} from "@/components/charts/engine/maplibre/maplibreBootstrap";
import { gisMapTransformRequest } from "@/components/charts/engine/maplibre/gisMapTransformRequest";
import { resolveTileService } from "@/lib/tileServices";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

type MapLibreMap = InstanceType<Awaited<ReturnType<typeof loadMapLibreRuntime>>["Map"]>;
type StyleSpecification = import("maplibre-gl").StyleSpecification;

const DEFAULT_AUTO_ROTATE_SPEED = GLOBE_IDLE_ROTATION_DEG_PER_SEC;

function GisMapViewInner(props: ChartEngineViewProps) {
  const {
    chartConfig,
    viewModel,
    fill = false,
    height = 180,
    width,
    ariaLabel,
    onPaintReady,
    instanceKey,
    layoutFootprint,
  } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const appliedStyleKeyRef = useRef<string | null>(null);
  const syncedViewKeyRef = useRef<string | null>(null);
  const project = useMemo(() => readGisProject(chartConfig), [chartConfig]);
  const projectRef = useRef(project);
  projectRef.current = project;
  const overlayGeoJson = useMemo(
    () =>
      chartConfig
        ? buildGisOverlayGeoJson(chartConfig, viewModel.dataset.columns, viewModel.dataset.rows)
        : null,
    [chartConfig, viewModel.dataset.columns, viewModel.dataset.rows],
  );
  const [pmtilesStyle, setPmtilesStyle] = useState<StyleSpecification | null>(null);
  const [pmtilesLoading, setPmtilesLoading] = useState(false);
  const [pmtilesErrorHint, setPmtilesErrorHint] = useState<string | null>(null);
  const [mapErrorHint, setMapErrorHint] = useState<string | null>(null);

  const tileServiceId = project.tileServiceId;
  const flavor = project.basemapFlavor ?? "light";
  const view = project.view ?? DEFAULT_GIS_GLOBE_VIEW;
  const mapBootstrapKey = `${tileServiceId}:${project.projection ?? "globe"}`;

  useEffect(() => {
    if (!tileServiceId) {
      setPmtilesStyle(null);
      setPmtilesLoading(false);
      setPmtilesErrorHint("尚未选择 PMTiles 外部底图服务");
      return;
    }
    let cancelled = false;
    setPmtilesLoading(true);
    setPmtilesErrorHint(null);
    void resolveTileService(tileServiceId)
      .then(async (resolved) => {
        if (cancelled) return;
        await ensurePmtilesArchiveRegistered(resolved.pmtilesUrl);
        if (cancelled) return;
        setPmtilesStyle(
          buildPmtilesStyle(resolved, project.labelLang ?? "zh-Hans", {
            flavor,
            buildings3d: project.buildings3d,
            landColor: project.landColor,
            waterColor: project.waterColor,
            basemapLayers: project.basemapLayers,
          }),
        );
        setPmtilesErrorHint(null);
      })
      .catch(() => {
        if (cancelled) return;
        setPmtilesStyle(null);
        setPmtilesErrorHint("全球 PMTiles 底图暂不可用，请确认外部服务与平台登记");
      })
      .finally(() => {
        if (!cancelled) setPmtilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    flavor,
    project.basemapLayers,
    project.buildings3d,
    project.labelLang,
    project.landColor,
    project.waterColor,
    tileServiceId,
  ]);

  const basemapPatchKey = useMemo(
    () =>
      JSON.stringify({
        basemapLayers: project.basemapLayers,
        buildings3d: project.buildings3d,
        earthOpacity: project.earthOpacity ?? 1,
      }),
    [project.basemapLayers, project.buildings3d, project.earthOpacity],
  );

  const renderBasemap = useMemo(
    () => resolveGisRenderableBasemap(project, Boolean(pmtilesStyle)),
    [pmtilesStyle, project],
  );

  const style = useMemo(() => {
    if (!pmtilesStyle) return null;
    const withOverlay = overlayGeoJson
      ? appendGisOverlayLayers(pmtilesStyle, overlayGeoJson, flavor)
      : pmtilesStyle;
    return applyGisGlobeToStyle(withOverlay, project.projection, project.atmospherePreset);
  }, [flavor, overlayGeoJson, pmtilesStyle, project.atmospherePreset, project.projection]);

  const styleKey = useMemo(() => JSON.stringify(style), [style]);
  const atmosphereKey = useMemo(
    () => `${project.projection ?? "mercator"}:${project.atmospherePreset ?? "day"}`,
    [project.atmospherePreset, project.projection],
  );
  const configuredViewKey = useMemo(
    () => buildGisConfiguredViewKey(view),
    [view.bearing, view.center[0], view.center[1], view.pitch, view.zoom],
  );
  const earthOpacity = project.earthOpacity ?? 1;
  const projection = project.projection ?? "globe";
  const hostBackground =
    project.projection === "globe" ? spaceBackdropForPreset(project.atmospherePreset) : undefined;

  const applyConfiguredView = useCallback((map: MapLibreMap) => {
    const currentView = projectRef.current.view ?? DEFAULT_GIS_GLOBE_VIEW;
    const key = buildGisConfiguredViewKey(currentView);
    if (syncedViewKeyRef.current === key) return;
    if (!syncGisMapView(map, currentView)) return;
    syncedViewKeyRef.current = key;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !style || renderBasemap !== "pmtiles") return;

    let cancelled = false;
    let map: MapLibreMap | null = null;

    void (async () => {
      const maplibregl = await loadMapLibreRuntime();
      if (cancelled || !hostRef.current) return;

      const initialView = projectRef.current.view ?? DEFAULT_GIS_GLOBE_VIEW;

      map = new maplibregl.Map({
        container: host,
        style,
        center: initialView.center,
        zoom: initialView.zoom,
        bearing: initialView.bearing ?? 0,
        pitch: initialView.pitch ?? 0,
        attributionControl: false,
        transformRequest: gisMapTransformRequest,
      });
      mapRef.current = map;
      appliedStyleKeyRef.current = styleKey;
      syncedViewKeyRef.current = null;

      map.on("error", (event) => {
        if (cancelled) return;
        const raw =
          event.error instanceof Error
            ? event.error.message
            : typeof event.error === "string"
              ? event.error
              : "";
        const message = raw.trim() || "地图渲染失败";
        if (/failed to fetch|cors|networkerror|access-control/i.test(message)) {
          setMapErrorHint(
            "全球 PMTiles 瓦片跨域请求被阻断，请确认外部服务 CORS 与前端访问地址（localhost / 127.0.0.1）一致",
          );
          return;
        }
        setMapErrorHint(message);
      });

      map.once("load", () => {
        if (cancelled || !map) return;
        setMapErrorHint(null);
        const current = projectRef.current;
        applyBasemapRuntimePatch(map, {
          basemapLayers: current.basemapLayers,
          buildings3d: current.buildings3d !== false,
          earthOpacity: current.earthOpacity ?? 1,
        });
        applyGlobeAtmosphere(map, {
          projection: current.projection,
          fog: current.fog,
          atmospherePreset: current.atmospherePreset,
        });
        applyConfiguredView(map);
        map.resize();
        onPaintReady?.();
      });

    })();

    return () => {
      cancelled = true;
      setMapErrorHint(null);
      mapRef.current?.remove();
      mapRef.current = null;
      appliedStyleKeyRef.current = null;
      syncedViewKeyRef.current = null;
    };
  }, [applyConfiguredView, mapBootstrapKey, onPaintReady, renderBasemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || renderBasemap !== "pmtiles") return;

    let cancelled = false;
    let disposeControls: (() => void) | undefined;

    const syncControls = () => {
      void mountGisMapControls(map, project.showControls === true).then((dispose) => {
        if (cancelled) {
          dispose();
          return;
        }
        disposeControls = dispose;
      });
    };

    if (map.isStyleLoaded()) syncControls();
    else map.once("load", syncControls);

    return () => {
      cancelled = true;
      disposeControls?.();
    };
  }, [mapBootstrapKey, project.showControls, renderBasemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !style) return;
    if (appliedStyleKeyRef.current === styleKey) return;

    applyGisMapStylePreservingCamera(map, style, () => {
      applyBasemapRuntimePatch(map, {
        basemapLayers: project.basemapLayers,
        buildings3d: project.buildings3d !== false,
        earthOpacity,
      });
      map.resize();
      onPaintReady?.();
    });
    appliedStyleKeyRef.current = styleKey;
  }, [onPaintReady, style, styleKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyPatch = () => {
      applyBasemapRuntimePatch(map, {
        basemapLayers: project.basemapLayers,
        buildings3d: project.buildings3d !== false,
        earthOpacity,
      });
    };
    if (map.isStyleLoaded()) applyPatch();
    else map.once("load", applyPatch);
  }, [basemapPatchKey, earthOpacity, project.basemapLayers, project.buildings3d, styleKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyGlobeAtmosphere(
      map,
      {
        projection: project.projection,
        fog: project.fog,
        atmospherePreset: project.atmospherePreset,
      },
      { preserveCamera: true },
    );
  }, [atmosphereKey, project.atmospherePreset, project.fog, project.projection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (syncedViewKeyRef.current === configuredViewKey) return;

    const apply = () => applyConfiguredView(map);
    if (map.isStyleLoaded()) {
      apply();
      return;
    }
    map.once("load", apply);
  }, [applyConfiguredView, configuredViewKey]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    return mountGisGlobeHaloOverlay(
      shell,
      () => mapRef.current,
      project.atmospherePreset,
      project.projection,
    );
  }, [atmosphereKey, project.atmospherePreset, project.projection]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    return mountGisStarfieldOverlay(
      shell,
      () => mapRef.current,
      project.atmospherePreset,
      project.projection,
    );
  }, [atmosphereKey, project.atmospherePreset, project.projection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !project.autoRotate || project.projection !== "globe") return;
    const speed = project.autoRotateSpeed ?? DEFAULT_AUTO_ROTATE_SPEED;
    return startGisGlobeAutoRotate(map, speed);
  }, [project.autoRotate, project.autoRotateSpeed, project.projection]);

  const remeasureShell = useCallback(() => {
    mapRef.current?.resize();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    remeasureShell();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(remeasureShell) : null;
    observer?.observe(shell);
    return () => observer?.disconnect();
  }, [remeasureShell]);

  useEffect(() => {
    remeasureShell();
  }, [layoutFootprint?.width, layoutFootprint?.height, remeasureShell]);

  useEffect(() => {
    if (!instanceKey) return;
    return registerGisMapViewLiveControl(instanceKey, {
      capture: () => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return null;
        const center = map.getCenter();
        return {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        };
      },
      applyView: (nextView) => {
        const map = mapRef.current;
        if (!map || !syncGisMapView(map, nextView)) return false;
        syncedViewKeyRef.current = buildGisConfiguredViewKey(nextView);
        return true;
      },
    });
  }, [instanceKey]);

  const statusHint = pmtilesErrorHint ?? mapErrorHint;

  return (
    <div
      className={cn("relative overflow-hidden rounded-md", fill ? "h-full w-full" : undefined)}
      style={fill ? undefined : { width: width ?? "100%", height }}
    >
      <div
        ref={shellRef}
        className="relative h-full w-full"
        style={hostBackground ? { background: hostBackground } : undefined}
      >
        <div
          ref={hostRef}
          data-testid="gis-map-view"
          data-basemap={renderBasemap ?? "pending"}
          data-requested-basemap="pmtiles"
          data-atmosphere={project.atmospherePreset ?? "night"}
          data-projection={projection}
          data-earth-opacity={earthOpacity}
          className="relative z-[4] h-full w-full"
          role="img"
          aria-label={ariaLabel ?? "GIS 地图"}
        />
      </div>
      {pmtilesLoading ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/40 px-2 py-1 text-center text-[10px] text-white">
          正在加载全球底图…
        </div>
      ) : null}
      {statusHint ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] bg-red-600/90 px-2 py-1 text-center text-[10px] text-white">
          {statusHint}
        </div>
      ) : null}
    </div>
  );
}

export const GisMapView = memo(GisMapViewInner);
