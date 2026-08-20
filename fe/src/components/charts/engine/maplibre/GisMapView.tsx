import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildGisOverlayGeoJson } from "@/components/charts/engine/maplibre/gisMapOverlay";
import { readGisProject, resolveGisRenderableBasemap, DEFAULT_GIS_GLOBE_VIEW } from "@/components/charts/engine/maplibre/gisProject";
import {
  appendGisOverlayLayers,
  buildPmtilesStyle,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import { applyGisGlobeToStyle, spaceBackdropForPreset } from "@/components/charts/engine/maplibre/gisAtmosphereSky";
import {
  applyGlobeAtmosphere,
  mountGisMapControls,
  startGisGlobeAutoRotate,
  syncGisMapView,
} from "@/components/charts/engine/maplibre/gisMapRuntime";
import { mountGisStarfieldOverlay } from "@/components/charts/engine/maplibre/gisStarfield";
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

const DEFAULT_AUTO_ROTATE_SPEED = 4;

function GisMapViewInner(props: ChartEngineViewProps) {
  const { chartConfig, viewModel, fill = false, height = 180, width, ariaLabel, onPaintReady } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
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
  }, [flavor, project.buildings3d, project.labelLang, tileServiceId]);

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
  const hostBackground =
    project.projection === "globe" ? spaceBackdropForPreset(project.atmospherePreset) : undefined;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !style || renderBasemap !== "pmtiles") return;

    let cancelled = false;
    let map: MapLibreMap | null = null;
    let disposeControls: (() => void) | undefined;

    void (async () => {
      const maplibregl = await loadMapLibreRuntime();
      if (cancelled || !hostRef.current) return;

      map = new maplibregl.Map({
        container: host,
        style,
        center: view.center,
        zoom: view.zoom,
        bearing: view.bearing ?? 0,
        pitch: view.pitch ?? 0,
        attributionControl: false,
        transformRequest: gisMapTransformRequest,
      });
      mapRef.current = map;

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
        applyGlobeAtmosphere(map, {
          projection: current.projection,
          fog: current.fog,
          atmospherePreset: current.atmospherePreset,
        });
        map.resize();
        onPaintReady?.();
      });

      disposeControls = await mountGisMapControls(map, project.showControls === true);
    })();

    return () => {
      cancelled = true;
      setMapErrorHint(null);
      disposeControls?.();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onPaintReady, project.showControls, renderBasemap, styleKey, atmosphereKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || project.autoRotate) return;
    syncGisMapView(map, view);
  }, [project.autoRotate, view]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyGlobeAtmosphere(map, {
      projection: project.projection,
      fog: project.fog,
      atmospherePreset: project.atmospherePreset,
    });
  }, [atmosphereKey, project.atmospherePreset, project.fog, project.projection, styleKey]);

  useEffect(() => {
    return mountGisStarfieldOverlay(
      () => mapRef.current,
      project.atmospherePreset,
      project.projection,
    );
  }, [atmosphereKey, project.atmospherePreset, project.projection, styleKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !project.autoRotate || project.projection !== "globe") return;
    const speed = project.autoRotateSpeed ?? DEFAULT_AUTO_ROTATE_SPEED;
    return startGisGlobeAutoRotate(map, speed);
  }, [project.autoRotate, project.autoRotateSpeed, project.projection, styleKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const resize = () => mapRef.current?.resize();
    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    return () => observer?.disconnect();
  }, [styleKey]);

  const statusHint = pmtilesErrorHint ?? mapErrorHint;

  return (
    <div
      className={cn("relative overflow-hidden rounded-md", fill ? "h-full w-full" : undefined)}
      style={fill ? undefined : { width: width ?? "100%", height }}
    >
      <div
        ref={shellRef}
        className="relative h-full w-full"
        style={hostBackground ? { backgroundColor: hostBackground } : undefined}
      >
        <div
          ref={hostRef}
          data-testid="gis-map-view"
          data-basemap={renderBasemap ?? "pending"}
          data-requested-basemap="pmtiles"
          data-atmosphere={project.atmospherePreset ?? "day"}
          data-projection={project.projection ?? "globe"}
          className="relative z-[1] h-full w-full"
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
