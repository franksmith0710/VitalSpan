import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildGisOverlayGeoJson } from "@/components/charts/engine/maplibre/gisMapOverlay";
import { readGisProject, resolveGisRenderableBasemap } from "@/components/charts/engine/maplibre/gisProject";
import {
  appendGisOverlayLayers,
  buildPmtilesStyle,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import { gisMapTransformRequest } from "@/components/charts/engine/maplibre/gisMapTransformRequest";
import { registerPmtilesProtocol } from "@/components/charts/engine/maplibre/pmtilesProtocol";
import { resolveTileService } from "@/lib/tileServices";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

type MapLibreModule = typeof import("maplibre-gl");
type StyleSpecification = import("maplibre-gl").StyleSpecification;

let maplibreModulePromise: Promise<MapLibreModule> | null = null;

async function loadMapLibre(): Promise<MapLibreModule> {
  if (!maplibreModulePromise) {
    maplibreModulePromise = import("maplibre-gl");
  }
  const maplibregl = await maplibreModulePromise;
  await registerPmtilesProtocol(maplibregl);
  return maplibregl;
}

function applyGlobeAtmosphere(
  map: InstanceType<MapLibreModule["Map"]>,
  projection: "mercator" | "globe" | undefined,
  fog: Record<string, unknown> | undefined,
) {
  if (projection === "globe") {
    map.setProjection({ type: "globe" });
    const setFog = (map as unknown as { setFog?: (spec: Record<string, unknown>) => void }).setFog;
    setFog?.(fog ?? {});
  } else {
    map.setProjection({ type: "mercator" });
  }
}

function GisMapViewInner(props: ChartEngineViewProps) {
  const { chartConfig, viewModel, fill = false, height = 180, width, ariaLabel, onPaintReady } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<InstanceType<MapLibreModule["Map"]> | null>(null);
  const project = useMemo(() => readGisProject(chartConfig), [chartConfig]);
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
      .then((resolved) => {
        if (cancelled) return;
        setPmtilesStyle(buildPmtilesStyle(resolved, project.labelLang ?? "zh-Hans"));
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
  }, [project.labelLang, tileServiceId]);

  const renderBasemap = useMemo(
    () => resolveGisRenderableBasemap(project, Boolean(pmtilesStyle)),
    [pmtilesStyle, project],
  );

  const style = useMemo(() => {
    if (!pmtilesStyle) return null;
    return overlayGeoJson ? appendGisOverlayLayers(pmtilesStyle, overlayGeoJson) : pmtilesStyle;
  }, [overlayGeoJson, pmtilesStyle]);

  const useGlobe = project.projection === "globe";

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !style || renderBasemap !== "pmtiles") return;

    let cancelled = false;
    let map: InstanceType<MapLibreModule["Map"]> | null = null;
    const currentStyle = style;
    const view = project.view ?? { center: [104, 35] as [number, number], zoom: 3.2 };

    void (async () => {
      const maplibregl = await loadMapLibre();
      if (cancelled || !hostRef.current) return;

      map = new maplibregl.Map({
        container: host,
        style: currentStyle,
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
        if (useGlobe) {
          applyGlobeAtmosphere(map, "globe", project.fog);
        }
        map.resize();
        onPaintReady?.();
      });
    })();

    return () => {
      cancelled = true;
      setMapErrorHint(null);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [
    onPaintReady,
    project.fog,
    project.view?.bearing,
    project.view?.center?.[0],
    project.view?.center?.[1],
    project.view?.pitch,
    project.view?.zoom,
    renderBasemap,
    style,
    useGlobe,
  ]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const resize = () => mapRef.current?.resize();
    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    return () => observer?.disconnect();
  }, [style]);

  const statusHint = pmtilesErrorHint ?? mapErrorHint;

  return (
    <div
      className={cn("relative overflow-hidden rounded-md", fill ? "h-full w-full" : undefined)}
      style={fill ? undefined : { width: width ?? "100%", height }}
    >
      <div
        ref={hostRef}
        data-testid="gis-map-view"
        data-basemap={renderBasemap ?? "pending"}
        data-requested-basemap="pmtiles"
        className="h-full w-full"
        role="img"
        aria-label={ariaLabel ?? "GIS 地图"}
      />
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
