import { memo, useEffect, useMemo, useRef, useState } from "react";
import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildGisOverlayGeoJson } from "@/components/charts/engine/maplibre/gisMapOverlay";
import { readGisProject, resolveGisRenderableBasemap } from "@/components/charts/engine/maplibre/gisProject";
import {
  appendGisOverlayLayers,
  buildPmtilesStyle,
  resolveGisMapStyleFromProject,
} from "@/components/charts/engine/maplibre/gisMapStyle";
import { gisMapTransformRequest } from "@/components/charts/engine/maplibre/gisMapTransformRequest";
import { registerPmtilesProtocol } from "@/components/charts/engine/maplibre/pmtilesProtocol";
import { resolveTileService } from "@/lib/tileServices";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

type MapLibreModule = typeof import("maplibre-gl");
type StyleSpecification = import("maplibre-gl").StyleSpecification;
type FeatureCollection = GeoJSON.FeatureCollection;

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
  const [pmtilesFallbackHint, setPmtilesFallbackHint] = useState<string | null>(null);

  const wantsPmtiles = project.basemap === "pmtiles" && Boolean(project.tileServiceId);

  useEffect(() => {
    if (!wantsPmtiles || !project.tileServiceId) {
      setPmtilesStyle(null);
      setPmtilesLoading(false);
      setPmtilesFallbackHint(null);
      return;
    }
    let cancelled = false;
    setPmtilesLoading(true);
    setPmtilesFallbackHint(null);
    void resolveTileService(project.tileServiceId)
      .then((resolved) => {
        if (cancelled) return;
        setPmtilesStyle(buildPmtilesStyle(resolved, project.labelLang ?? "zh-Hans"));
        setPmtilesFallbackHint(null);
      })
      .catch(() => {
        if (cancelled) return;
        setPmtilesStyle(null);
        setPmtilesFallbackHint("全球底图服务暂不可用，已显示离线省界");
      })
      .finally(() => {
        if (!cancelled) setPmtilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project.labelLang, project.tileServiceId, wantsPmtiles]);

  const renderBasemap = useMemo(
    () => resolveGisRenderableBasemap(project, Boolean(pmtilesStyle)),
    [pmtilesStyle, project],
  );

  const style = useMemo(() => {
    let base: StyleSpecification;
    if (renderBasemap === "pmtiles" && pmtilesStyle) {
      base = pmtilesStyle;
    } else {
      base = resolveGisMapStyleFromProject(
        { ...project, basemap: renderBasemap === "pmtiles" ? "china-provinces" : renderBasemap },
        renderBasemap === "china-provinces" ? (chinaProvincesGeo as FeatureCollection) : undefined,
      );
    }
    return overlayGeoJson ? appendGisOverlayLayers(base, overlayGeoJson) : base;
  }, [overlayGeoJson, pmtilesStyle, project, renderBasemap]);

  const useGlobe = renderBasemap === "pmtiles" && project.projection === "globe";

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !style) return;

    let cancelled = false;
    let map: InstanceType<MapLibreModule["Map"]> | null = null;
    const currentStyle = style;
    const view = project.view ?? { center: [104, 35] as [number, number], zoom: 3.2 };

    void (async () => {
      const maplibregl = await import("maplibre-gl");
      if (renderBasemap === "pmtiles") {
        await registerPmtilesProtocol(maplibregl);
      }
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

      map.once("load", () => {
        if (cancelled || !map) return;
        if (useGlobe) {
          applyGlobeAtmosphere(map, "globe", project.fog);
        }
        onPaintReady?.();
      });
    })();

    return () => {
      cancelled = true;
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
    const map = mapRef.current;
    if (!map || !style) return;
    if (!map.isStyleLoaded()) return;
    map.setStyle(style);
    const currentView = project.view ?? { center: [104, 35] as [number, number], zoom: 3.2 };
    map.jumpTo({
      center: currentView.center,
      zoom: currentView.zoom,
      bearing: currentView.bearing ?? 0,
      pitch: currentView.pitch ?? 0,
    });
    if (useGlobe) {
      applyGlobeAtmosphere(map, "globe", project.fog);
    } else {
      applyGlobeAtmosphere(map, "mercator", undefined);
    }
  }, [project.fog, project.view, style, useGlobe]);

  return (
    <div
      className={cn("relative overflow-hidden rounded-md", fill ? "h-full w-full" : undefined)}
      style={fill ? undefined : { width: width ?? "100%", height }}
    >
      <div
        ref={hostRef}
        data-testid="gis-map-view"
        data-basemap={renderBasemap}
        data-requested-basemap={project.basemap}
        className="h-full w-full"
        role="img"
        aria-label={ariaLabel ?? "GIS 地图"}
      />
      {pmtilesLoading ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/40 px-2 py-1 text-center text-[10px] text-white">
          正在加载全球底图…
        </div>
      ) : null}
      {pmtilesFallbackHint ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-amber-500/90 px-2 py-1 text-center text-[10px] text-white">
          {pmtilesFallbackHint}
        </div>
      ) : null}
    </div>
  );
}

export const GisMapView = memo(GisMapViewInner);
