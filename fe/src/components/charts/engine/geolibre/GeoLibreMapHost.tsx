import { memo, useEffect, useMemo, useRef, useState } from "react";
import { GeoLibreStoreProvider, pushGeoLibreStoreScope } from "@geolibre/core";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { readGeolibreProject } from "@/components/charts/engine/geolibre/geolibreProject";
import {
  createWidgetGeoLibreStore,
  loadWidgetGeoLibreProject,
  registerWidgetGeoLibreStore,
  unregisterWidgetGeoLibreStore,
} from "@/components/charts/engine/geolibre/geolibreWidgetStore";
import { cn } from "@/lib/utils";

type MapCanvasComponent = typeof import("@geolibre/map").MapCanvas;

function GeoLibreMapHostInner(props: ChartEngineViewProps) {
  const { chartConfig, fill = false, height = 180, width, ariaLabel, onPaintReady, instanceKey } = props;
  const project = useMemo(() => readGeolibreProject(chartConfig), [chartConfig]);
  const store = useMemo(() => createWidgetGeoLibreStore(project), []);
  const projectFingerprint = useMemo(() => JSON.stringify(project), [project]);
  const lastFingerprint = useRef(projectFingerprint);
  const [MapCanvas, setMapCanvas] = useState<MapCanvasComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@geolibre/map").then((mod) => {
      if (!cancelled) setMapCanvas(() => mod.MapCanvas);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!instanceKey) return;
    registerWidgetGeoLibreStore(instanceKey, store);
    return () => unregisterWidgetGeoLibreStore(instanceKey, store);
  }, [store, instanceKey]);

  useEffect(() => {
    const popScope = pushGeoLibreStoreScope(store);
    return popScope;
  }, [store]);

  useEffect(() => {
    if (lastFingerprint.current === projectFingerprint) return;
    lastFingerprint.current = projectFingerprint;
    loadWidgetGeoLibreProject(store, project);
  }, [project, projectFingerprint, store]);

  return (
    <GeoLibreStoreProvider store={store}>
      <div
        data-testid="geolibre-map-host"
        className={cn("relative overflow-hidden rounded-md", fill ? "h-full w-full" : undefined)}
        style={fill ? undefined : { width: width ?? "100%", height }}
        role="img"
        aria-label={ariaLabel ?? "GIS 地图"}
      >
        {MapCanvas ? (
          <MapCanvas
            onControllerReady={() => onPaintReady?.()}
            canUseRemoteElevation={() => false}
          />
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center text-theme-xs text-gray-500">
            地图加载中…
          </div>
        )}
      </div>
    </GeoLibreStoreProvider>
  );
}

export const GeoLibreMapHost = memo(GeoLibreMapHostInner);
