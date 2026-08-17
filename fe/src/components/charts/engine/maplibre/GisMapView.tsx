import { memo, useEffect, useMemo, useRef } from "react";
import type { FeatureCollection } from "geojson";
import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { readGisProject } from "@/components/charts/engine/maplibre/gisProject";
import { resolveGisMapStyleFromProject } from "@/components/charts/engine/maplibre/gisMapStyle";
import { gisMapTransformRequest } from "@/components/charts/engine/maplibre/gisMapTransformRequest";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

type MapLibreModule = typeof import("maplibre-gl");

function GisMapViewInner(props: ChartEngineViewProps) {
  const { chartConfig, fill = false, height = 180, width, ariaLabel, onPaintReady } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<InstanceType<MapLibreModule["Map"]> | null>(null);
  const project = useMemo(() => readGisProject(chartConfig), [chartConfig]);
  const style = useMemo(
    () =>
      resolveGisMapStyleFromProject(
        project,
        project.basemap === "china-provinces" ? (chinaProvincesGeo as FeatureCollection) : undefined,
      ),
    [project],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let map: InstanceType<MapLibreModule["Map"]> | null = null;
    const currentStyle = style;
    const view = project.view ?? { center: [104, 35] as [number, number], zoom: 3.2 };

    void (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !hostRef.current) return;

      map = new maplibregl.Map({
        container: host,
        style: currentStyle,
        center: view.center,
        zoom: view.zoom,
        attributionControl: false,
        transformRequest: gisMapTransformRequest,
      });
      mapRef.current = map;

      map.once("load", () => {
        if (cancelled) return;
        onPaintReady?.();
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onPaintReady, project.basemap, project.view?.center?.[0], project.view?.center?.[1], project.view?.zoom, style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setStyle(style);
    if (project.view) {
      map.jumpTo({ center: project.view.center, zoom: project.view.zoom });
    }
  }, [project.view, style]);

  return (
    <div
      ref={hostRef}
      data-testid="gis-map-view"
      data-basemap={project.basemap}
      className={cn("relative overflow-hidden rounded-md", fill ? "h-full w-full" : undefined)}
      style={fill ? undefined : { width: width ?? "100%", height }}
      role="img"
      aria-label={ariaLabel ?? "GIS 地图"}
    />
  );
}

export const GisMapView = memo(GisMapViewInner);
