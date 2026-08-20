import type { ChartViewConfig } from "@/lib/chartViewConfig";

export type GisBasemapId = "blank" | "china-provinces" | "pmtiles";
export type GisLabelLang = "zh-Hans" | "en";
export type GisProjection = "mercator" | "globe";

export type GisProjectView = {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
};

export type GisProjectFog = {
  color?: string;
  "high-color"?: string;
  "horizon-blend"?: number;
  "space-color"?: string;
  "star-intensity"?: number;
};

export type GisProject = {
  basemap: GisBasemapId;
  tileServiceId?: string;
  labelLang?: GisLabelLang;
  projection?: GisProjection;
  fog?: GisProjectFog;
  view?: GisProjectView;
};

export const DEFAULT_GIS_PROJECT: GisProject = {
  basemap: "china-provinces",
  labelLang: "zh-Hans",
  projection: "mercator",
  view: { center: [104.0, 35.0], zoom: 3.2 },
};

const ALLOWED_BASEMAPS = new Set<GisBasemapId>(["blank", "china-provinces", "pmtiles"]);
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

export function writeGisProject(
  config: ChartViewConfig,
  patch: Partial<GisProject>,
): ChartViewConfig {
  const current = readGisProject(config);
  const next = normalizeGisProject({ ...current, ...patch });
  return {
    ...config,
    nativeBody: {
      ...config.nativeBody,
      gisProject: next,
    },
  };
}

function normalizeGisProject(raw: unknown): GisProject {
  const candidate = raw as Partial<GisProject>;
  const basemap =
    typeof candidate.basemap === "string" && ALLOWED_BASEMAPS.has(candidate.basemap as GisBasemapId)
      ? (candidate.basemap as GisBasemapId)
      : DEFAULT_GIS_PROJECT.basemap;
  const tileServiceId =
    typeof candidate.tileServiceId === "string" && candidate.tileServiceId.trim()
      ? candidate.tileServiceId.trim()
      : undefined;
  if (basemap === "pmtiles" && !tileServiceId) {
    return {
      ...DEFAULT_GIS_PROJECT,
      view: normalizeGisView(candidate.view) ?? DEFAULT_GIS_PROJECT.view,
    };
  }
  const labelLang =
    candidate.labelLang === "en" || candidate.labelLang === "zh-Hans"
      ? candidate.labelLang
      : DEFAULT_GIS_PROJECT.labelLang;
  const projection =
    candidate.projection === "globe" || candidate.projection === "mercator"
      ? candidate.projection
      : DEFAULT_GIS_PROJECT.projection;
  const view = normalizeGisView(candidate.view) ?? DEFAULT_GIS_PROJECT.view;
  const fog = normalizeGisFog(candidate.fog);
  return {
    basemap,
    tileServiceId: basemap === "pmtiles" ? tileServiceId : undefined,
    labelLang,
    projection,
    fog,
    view,
  };
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
  return { ...DEFAULT_GIS_PROJECT, basemap, view };
}

function normalizeGisView(input: unknown): GisProjectView | undefined {
  if (!input || typeof input !== "object") return undefined;
  const view = input as Partial<GisProjectView>;
  if (!Array.isArray(view.center) || view.center.length !== 2) return undefined;
  const lng = Number(view.center[0]);
  const lat = Number(view.center[1]);
  const zoom = Number(view.zoom);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(zoom)) return undefined;
  const bearing = Number(view.bearing);
  const pitch = Number(view.pitch);
  return {
    center: [lng, lat],
    zoom,
    bearing: Number.isFinite(bearing) ? bearing : undefined,
    pitch: Number.isFinite(pitch) ? pitch : undefined,
  };
}

function normalizeGisFog(input: unknown): GisProjectFog | undefined {
  if (!input || typeof input !== "object") return undefined;
  const fog = input as GisProjectFog;
  return {
    color: typeof fog.color === "string" ? fog.color : undefined,
    "high-color": typeof fog["high-color"] === "string" ? fog["high-color"] : undefined,
    "horizon-blend": Number.isFinite(Number(fog["horizon-blend"]))
      ? Number(fog["horizon-blend"])
      : undefined,
    "space-color": typeof fog["space-color"] === "string" ? fog["space-color"] : undefined,
    "star-intensity": Number.isFinite(Number(fog["star-intensity"]))
      ? Number(fog["star-intensity"])
      : undefined,
  };
}

export function defaultGisProjectNativeBody(): Record<string, unknown> {
  return { gisProject: DEFAULT_GIS_PROJECT };
}

export function gisOverlayFieldsReady(config: ChartViewConfig): boolean {
  const dims = (config.dimensions ?? []).map((d) => d.field?.trim()).filter(Boolean);
  return dims.length >= 2;
}

/** 运行时实际渲染的底图：PMTiles 未就绪时回退离线省界，保证默认可用 */
export function resolveGisRenderableBasemap(
  project: GisProject,
  pmtilesReady: boolean,
): Exclude<GisBasemapId, "pmtiles"> | "pmtiles" {
  if (project.basemap === "pmtiles" && project.tileServiceId && pmtilesReady) {
    return "pmtiles";
  }
  if (project.basemap === "blank") return "blank";
  return "china-provinces";
}
