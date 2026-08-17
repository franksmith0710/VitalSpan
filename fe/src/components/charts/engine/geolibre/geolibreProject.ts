import type { FeatureCollection } from "geojson";
import {
  BLANK_BASEMAP,
  createEmptyProject,
  initialLayerStyle,
  type GeoLibreLayer,
  type GeoLibreProject,
} from "@geolibre/core";
import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { GisBasemapId, GisProject } from "@/components/charts/engine/maplibre/gisProject";
import { DEFAULT_GIS_PROJECT, readGisProject } from "@/components/charts/engine/maplibre/gisProject";

export const VITALSPAN_CHINA_LAYER_ID = "vitalspan-china-provinces";
export const VITALSPAN_CHINA_LAYER_NAME = "中国省级行政区";

const CHINA_VIEW = { center: [104.0, 35.0] as [number, number], zoom: 3.2, bearing: 0, pitch: 0 };

function buildChinaProvincesLayer(geojson: FeatureCollection): GeoLibreLayer {
  return {
    id: VITALSPAN_CHINA_LAYER_ID,
    name: VITALSPAN_CHINA_LAYER_NAME,
    type: "geojson",
    source: { type: "geojson" },
    visible: true,
    opacity: 1,
    style: initialLayerStyle({ geojson, layers: [] }),
    metadata: { vitalspanTemplate: "china-provinces" },
    geojson,
  };
}

/** VitalSpan 默认离线工程：空白底图 + 内置中国省界矢量层。 */
export function buildDefaultGeolibreProject(): GeoLibreProject {
  const geojson = chinaProvincesGeo as FeatureCollection;
  const layer = buildChinaProvincesLayer(geojson);
  const base = createEmptyProject("VitalSpan GIS Map", {
    basemapStyleUrl: BLANK_BASEMAP,
    mapView: CHINA_VIEW,
  });
  return {
    ...base,
    basemapVisible: false,
    layers: [layer],
    styles: { [layer.id]: layer.style },
    selectedLayerId: layer.id,
  };
}

function migrateGisProject(gisProject: GisProject): GeoLibreProject {
  const project = buildDefaultGeolibreProject();
  if (gisProject.view) {
    project.mapView = {
      center: gisProject.view.center,
      zoom: gisProject.view.zoom,
      bearing: 0,
      pitch: 0,
    };
  }
  if (gisProject.basemap === "blank") {
    project.basemapStyleUrl = BLANK_BASEMAP;
    project.basemapVisible = false;
    project.layers = [];
    project.styles = {};
    project.selectedLayerId = null;
    return project;
  }
  return project;
}

export function readGeolibreProject(config: ChartViewConfig | undefined): GeoLibreProject {
  const raw = config?.nativeBody?.geolibreProject;
  if (raw && typeof raw === "object") {
    const candidate = raw as Partial<GeoLibreProject>;
    if (typeof candidate.version === "string" && Array.isArray(candidate.layers)) {
      return {
        ...buildDefaultGeolibreProject(),
        ...candidate,
        layers: candidate.layers ?? [],
        styles: candidate.styles ?? {},
      };
    }
  }
  return migrateGisProject(readGisProject(config));
}

export function defaultGeolibreProjectNativeBody(): Record<string, unknown> {
  return { geolibreProject: buildDefaultGeolibreProject() };
}

export type VitalSpanBasemapChoice = "blank" | "china-provinces";

export function basemapChoiceFromProject(project: GeoLibreProject): VitalSpanBasemapChoice {
  const hasChinaLayer = project.layers.some(
    (layer) => layer.id === VITALSPAN_CHINA_LAYER_ID || layer.metadata?.vitalspanTemplate === "china-provinces",
  );
  if (project.basemapStyleUrl === BLANK_BASEMAP && !hasChinaLayer) return "blank";
  return "china-provinces";
}

export function applyBasemapChoice(
  project: GeoLibreProject,
  choice: VitalSpanBasemapChoice,
): GeoLibreProject {
  if (choice === "blank") {
    return {
      ...project,
      basemapStyleUrl: BLANK_BASEMAP,
      basemapVisible: false,
      layers: project.layers.filter(
        (layer) =>
          layer.id !== VITALSPAN_CHINA_LAYER_ID && layer.metadata?.vitalspanTemplate !== "china-provinces",
      ),
      styles: Object.fromEntries(
        Object.entries(project.styles).filter(([id]) => id !== VITALSPAN_CHINA_LAYER_ID),
      ),
      selectedLayerId:
        project.selectedLayerId === VITALSPAN_CHINA_LAYER_ID ? null : project.selectedLayerId,
    };
  }
  const geojson = chinaProvincesGeo as FeatureCollection;
  const layer = buildChinaProvincesLayer(geojson);
  const withoutTemplate = project.layers.filter(
    (layerItem) =>
      layerItem.id !== VITALSPAN_CHINA_LAYER_ID && layerItem.metadata?.vitalspanTemplate !== "china-provinces",
  );
  return {
    ...project,
    basemapStyleUrl: BLANK_BASEMAP,
    basemapVisible: false,
    layers: [layer, ...withoutTemplate],
    styles: { ...project.styles, [layer.id]: layer.style },
    selectedLayerId: project.selectedLayerId ?? layer.id,
  };
}
