import {
  createGeoLibreStore,
  projectFromStore,
  type GeoLibreProject,
  type GeoLibreStoreApi,
} from "@geolibre/core";

const stores = new Map<string, GeoLibreStoreApi>();

export function createWidgetGeoLibreStore(project: GeoLibreProject): GeoLibreStoreApi {
  const store = createGeoLibreStore() as GeoLibreStoreApi;
  store.getState().loadProject(structuredClone(project), null, { presenting: false });
  return store;
}

export function registerWidgetGeoLibreStore(widgetId: string, store: GeoLibreStoreApi): void {
  stores.set(widgetId, store);
}

export function unregisterWidgetGeoLibreStore(widgetId: string, store: GeoLibreStoreApi): void {
  if (stores.get(widgetId) === store) stores.delete(widgetId);
}

export function getWidgetGeoLibreStore(widgetId: string): GeoLibreStoreApi | undefined {
  return stores.get(widgetId);
}

export function projectFromWidgetStore(store: GeoLibreStoreApi): GeoLibreProject {
  const state = store.getState();
  return projectFromStore({
    projectName: state.projectName,
    mapView: state.mapView,
    basemapStyleUrl: state.basemapStyleUrl,
    basemapVisible: state.basemapVisible,
    basemapOpacity: state.basemapOpacity,
    layers: state.layers,
    selectedLayerId: state.selectedLayerId,
    layerGroups: state.layerGroups,
    preferences: state.preferences,
    plugins: state.projectPlugins,
    legend: state.legend,
    storymap: state.storymap,
    models: state.models,
    processingHistory: state.processingHistory,
    widgets: state.widgets,
    dashboardColumns: state.dashboardColumns,
    mapLayout: state.mapLayout,
    secondaryMapViews: state.secondaryMapViews,
    primaryMapLabel: state.primaryMapLabel,
    styleLibrary: state.projectStyleLibrary,
    comments: state.comments,
    metadata: state.metadata,
  });
}

export function loadWidgetGeoLibreProject(store: GeoLibreStoreApi, project: GeoLibreProject): void {
  store.getState().loadProject(structuredClone(project), null, { presenting: false });
}
