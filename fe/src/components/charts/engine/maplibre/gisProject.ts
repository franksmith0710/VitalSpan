import type { ChartViewConfig } from "@/lib/chartViewConfig";

/** 一期仅 blank / 离线中国省界；二期扩展 templateId / serviceId */
export type GisBasemapId = "blank" | "china-provinces";

export type GisProjectView = {
  center: [number, number];
  zoom: number;
};

export type GisProject = {
  basemap: GisBasemapId;
  view?: GisProjectView;
};

export const DEFAULT_GIS_PROJECT: GisProject = {
  basemap: "china-provinces",
  view: { center: [104.0, 35.0], zoom: 3.2 },
};

const ALLOWED_BASEMAPS = new Set<GisBasemapId>(["blank", "china-provinces"]);

const CHINA_LAYER_ID = "vitalspan-china-provinces";

export function readGisProject(config: ChartViewConfig | undefined): GisProject {
  const raw = config?.nativeBody?.gisProject;
  if (raw && typeof raw === "object") {
    return normalizeGisProject(raw);
  }
  const legacy = config?.nativeBody?.geolibreProject;
  if (legacy && typeof legacy === "object") {
    return migrateGeolibreProject(legacy);
  }
  return DEFAULT_GIS_PROJECT;
}

function normalizeGisProject(raw: unknown): GisProject {
  const candidate = raw as Partial<GisProject>;
  const basemap =
    typeof candidate.basemap === "string" && ALLOWED_BASEMAPS.has(candidate.basemap as GisBasemapId)
      ? (candidate.basemap as GisBasemapId)
      : DEFAULT_GIS_PROJECT.basemap;
  const view = normalizeGisView(candidate.view) ?? DEFAULT_GIS_PROJECT.view;
  return { basemap, view };
}

function migrateGeolibreProject(raw: unknown): GisProject {
  const project = raw as {
    layers?: Array<{ id?: string; metadata?: { vitalspanTemplate?: string } }>;
    mapView?: { center?: [number, number]; zoom?: number };
  };
  const hasChinaLayer =
    Array.isArray(project.layers) &&
    project.layers.some(
      (layer) =>
        layer.id === CHINA_LAYER_ID || layer.metadata?.vitalspanTemplate === "china-provinces",
    );
  const basemap: GisBasemapId = hasChinaLayer ? "china-provinces" : "blank";
  const view = normalizeGisView(project.mapView) ?? DEFAULT_GIS_PROJECT.view;
  return { basemap, view };
}

function normalizeGisView(input: unknown): GisProjectView | undefined {
  if (!input || typeof input !== "object") return undefined;
  const view = input as Partial<GisProjectView>;
  if (!Array.isArray(view.center) || view.center.length !== 2) return undefined;
  const lng = Number(view.center[0]);
  const lat = Number(view.center[1]);
  const zoom = Number(view.zoom);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(zoom)) return undefined;
  return { center: [lng, lat], zoom };
}

export function defaultGisProjectNativeBody(): Record<string, unknown> {
  return { gisProject: DEFAULT_GIS_PROJECT };
}
