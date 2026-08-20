import type { ChartViewConfig } from "@/lib/chartViewConfig";

/** gis-map 仅支持管理员登记的全球 PMTiles 外部底图。 */
export type GisBasemapId = "pmtiles";
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

/** 本地/演示默认登记的全球 PMTiles 服务（运维 register 脚本同名 id）。 */
export const DEFAULT_PMTILES_TILE_SERVICE_ID = "planet-z15";

/** MapLibre 球面地球默认大气（星空背景，接近 GeoLibre 球面观感）。 */
export const DEFAULT_GLOBE_FOG: GisProjectFog = {
  color: "rgb(186, 210, 235)",
  "high-color": "rgb(36, 92, 223)",
  "horizon-blend": 0.02,
  "space-color": "rgb(11, 11, 25)",
  "star-intensity": 0.6,
};

export const DEFAULT_GIS_GLOBE_VIEW: GisProjectView = {
  center: [20.0, 20.0],
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
};

export const DEFAULT_GIS_PROJECT: GisProject = {
  basemap: "pmtiles",
  tileServiceId: DEFAULT_PMTILES_TILE_SERVICE_ID,
  labelLang: "zh-Hans",
  projection: "mercator",
  view: { center: [104.0, 35.0], zoom: 3.2 },
};

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
  const tileServiceId =
    typeof candidate.tileServiceId === "string" && candidate.tileServiceId.trim()
      ? candidate.tileServiceId.trim()
      : DEFAULT_PMTILES_TILE_SERVICE_ID;
  const labelLang =
    candidate.labelLang === "en" || candidate.labelLang === "zh-Hans"
      ? candidate.labelLang
      : DEFAULT_GIS_PROJECT.labelLang;
  const projection =
    candidate.projection === "globe" || candidate.projection === "mercator"
      ? candidate.projection
      : DEFAULT_GIS_PROJECT.projection;
  const view = normalizeGisView(candidate.view) ?? (projection === "globe" ? DEFAULT_GIS_GLOBE_VIEW : DEFAULT_GIS_PROJECT.view);
  const fog = resolveGisFog(projection, candidate.fog);
  return {
    basemap: "pmtiles",
    tileServiceId,
    labelLang,
    projection,
    fog,
    view,
  };
}

function migrateGeolibreProject(raw: unknown): GisProject {
  const project = raw as { mapView?: { center?: [number, number]; zoom?: number } };
  const view = normalizeGisView(project.mapView) ?? DEFAULT_GIS_PROJECT.view;
  return { ...DEFAULT_GIS_PROJECT, view };
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

function resolveGisFog(projection: GisProjection, input: unknown): GisProjectFog | undefined {
  if (projection !== "globe") return undefined;
  const parsed = normalizeGisFog(input);
  if (parsed && Object.keys(parsed).length > 0) return { ...DEFAULT_GLOBE_FOG, ...parsed };
  return DEFAULT_GLOBE_FOG;
}

function normalizeGisFog(input: unknown): GisProjectFog | undefined {
  if (!input || typeof input !== "object") return undefined;
  const fog = input as GisProjectFog;
  const next: GisProjectFog = {};
  if (typeof fog.color === "string") next.color = fog.color;
  if (typeof fog["high-color"] === "string") next["high-color"] = fog["high-color"];
  if (Number.isFinite(Number(fog["horizon-blend"]))) next["horizon-blend"] = Number(fog["horizon-blend"]);
  if (typeof fog["space-color"] === "string") next["space-color"] = fog["space-color"];
  if (Number.isFinite(Number(fog["star-intensity"]))) next["star-intensity"] = Number(fog["star-intensity"]);
  return Object.keys(next).length > 0 ? next : undefined;
}

export function defaultGisProjectNativeBody(): Record<string, unknown> {
  return { gisProject: DEFAULT_GIS_PROJECT };
}

export function gisOverlayFieldsReady(config: ChartViewConfig): boolean {
  const dims = (config.dimensions ?? []).map((d) => d.field?.trim()).filter(Boolean);
  return dims.length >= 2;
}

/** PMTiles 样式就绪后才渲染；未就绪时不回退离线底图。 */
export function resolveGisRenderableBasemap(
  project: GisProject,
  pmtilesReady: boolean,
): "pmtiles" | null {
  if (!project.tileServiceId || !pmtilesReady) return null;
  return "pmtiles";
}
