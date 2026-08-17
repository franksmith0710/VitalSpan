import { useCallback, useMemo } from "react";
import { useStore } from "zustand";
import type { GeoLibreProject, GeoLibreStoreApi } from "@geolibre/core";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import { readGeolibreProject } from "@/components/charts/engine/geolibre/geolibreProject";
import {
  createWidgetGeoLibreStore,
  getWidgetGeoLibreStore,
  loadWidgetGeoLibreProject,
  projectFromWidgetStore,
} from "@/components/charts/engine/geolibre/geolibreWidgetStore";

export function useGisMapStore(): {
  store: GeoLibreStoreApi;
  project: GeoLibreProject;
  persistProject: () => void;
} {
  const { widget, cfg, onChange } = useChartInspector();
  const project = useMemo(() => readGeolibreProject(cfg), [cfg]);
  const fallbackStore = useMemo(() => createWidgetGeoLibreStore(project), [project]);
  const store = getWidgetGeoLibreStore(widget.id) ?? fallbackStore;

  const persistProject = useCallback(() => {
    const nextProject = projectFromWidgetStore(store);
    onChange({
      ...cfg,
      nativeBody: {
        ...cfg.nativeBody,
        geolibreProject: nextProject,
      },
    });
    const liveStore = getWidgetGeoLibreStore(widget.id);
    if (liveStore && liveStore !== store) {
      loadWidgetGeoLibreProject(liveStore, nextProject);
    }
  }, [cfg, onChange, store, widget.id]);

  return { store, project, persistProject };
}

export function useGisMapStoreSelector<T>(
  selector: (state: ReturnType<GeoLibreStoreApi["getState"]>) => T,
): T {
  const { store } = useGisMapStore();
  return useStore(store, selector);
}
