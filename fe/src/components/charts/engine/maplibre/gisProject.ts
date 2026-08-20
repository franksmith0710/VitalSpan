import type { ChartViewConfig } from "@/lib/chartViewConfig";

/** gis-map 仅支持管理员登记的全球 PMTiles 外部底图。 */
export type GisBasemapId = "pmtiles";
export type GisLabelLang = "zh-Hans" | "en";
export type GisProjection = "mercator" | "globe";
export type GisBasemapFlavor = "light" | "dark" | "grayscale" | "white" | "black";
export type GisAtmospherePreset = "day" | "dusk" | "deep-space";

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
  basemapFlavor?: GisBasemapFlavor;
  projection?: GisProjection;
  atmospherePreset?: GisAtmospherePreset;
  fog?: GisProjectFog;
  view?: GisProjectView;
  /** 球面模式下慢速自转（大屏待机） */
  autoRotate?: boolean;
  /** 自转速度（度/秒），默认 4 */
  autoRotateSpeed?: number;
  /** 显示缩放/罗盘/比例尺控件 */
  showControls?: boolean;
  /** 矢量底图建筑 3D 挤出（高 zoom） */
  buildings3d?: boolean;
};

/** 本地/演示默认登记的全球 PMTiles 服务（运维 register 脚本同名 id）。 */
export const DEFAULT_PMTILES_TILE_SERVICE_ID = "planet-z15";

export const GIS_BASEMAP_FLAVORS: GisBasemapFlavor[] = ["light", "dark", "grayscale", "white", "black"];

/** MapLibre 球面地球默认大气（深空星空，接近 GeoLibre 球面观感）。 */
export const DEFAULT_GLOBE_FOG: GisProjectFog = {
  color: "rgb(186, 210, 235)",
  "high-color": "rgb(36, 92, 223)",
  "horizon-blend": 0.02,
  "space-color": "rgb(11, 11, 25)",
  "star-intensity": 0.6,
};

export const GIS_ATMOSPHERE_PRESETS: Record<GisAtmospherePreset, GisProjectFog> = {
  day: {
    color: "rgb(186, 210, 235)",
    "high-color": "rgb(36, 92, 223)",
    "horizon-blend": 0.02,
    "space-color": "rgb(186, 210, 235)",
    "star-intensity": 0,
  },
  dusk: {
    color: "rgb(242, 192, 130)",
    "high-color": "rgb(220, 120, 60)",
    "horizon-blend": 0.08,
    "space-color": "rgb(30, 20, 40)",
    "star-intensity": 0.15,
  },
  "deep-space": DEFAULT_GLOBE_FOG,
};

/** 球面地球默认远视图（亚洲—印度洋半球，接近 GeoLibre 初始观感）。 */
export const DEFAULT_GIS_GLOBE_VIEW: GisProjectView = {
  center: [100.0, 28.0],
  zoom: 1.5,
  pitch: 0,
  bearing: 0,
};

export const DEFAULT_GIS_PROJECT: GisProject = {
  basemap: "pmtiles",
  tileServiceId: DEFAULT_PMTILES_TILE_SERVICE_ID,
  labelLang: "zh-Hans",
  basemapFlavor: "light",
  projection: "globe",
  atmospherePreset: "day",
  fog: GIS_ATMOSPHERE_PRESETS.day,
  view: DEFAULT_GIS_GLOBE_VIEW,
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

export function resolveGisAtmosphereFog(
  preset: GisAtmospherePreset | undefined,
  fogOverride: GisProjectFog | undefined,
): GisProjectFog {
  const base = preset ? GIS_ATMOSPHERE_PRESETS[preset] : DEFAULT_GLOBE_FOG;
  return fogOverride && Object.keys(fogOverride).length > 0 ? { ...base, ...fogOverride } : base;
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
  const basemapFlavor = normalizeBasemapFlavor(candidate.basemapFlavor);
  const projection =
    candidate.projection === "globe" || candidate.projection === "mercator"
      ? candidate.projection
      : DEFAULT_GIS_PROJECT.projection;
  const atmospherePreset = normalizeAtmospherePreset(candidate.atmospherePreset);
  const view =
    normalizeGisView(candidate.view) ??
    (projection === "globe" ? DEFAULT_GIS_GLOBE_VIEW : DEFAULT_GIS_PROJECT.view);
  const fog = resolveGisFog(projection, atmospherePreset);
  const autoRotateSpeed = Number(candidate.autoRotateSpeed);
  return {
    basemap: "pmtiles",
    tileServiceId,
    labelLang,
    basemapFlavor,
    projection,
    atmospherePreset: projection === "globe" ? atmospherePreset : undefined,
    fog,
    view,
    autoRotate: candidate.autoRotate === true,
    autoRotateSpeed: Number.isFinite(autoRotateSpeed) && autoRotateSpeed > 0 ? autoRotateSpeed : undefined,
    showControls: candidate.showControls === true,
    buildings3d: candidate.buildings3d === true,
  };
}

function migrateGeolibreProject(raw: unknown): GisProject {
  const project = raw as { mapView?: { center?: [number, number]; zoom?: number } };
  const view = normalizeGisView(project.mapView) ?? DEFAULT_GIS_PROJECT.view;
  return { ...DEFAULT_GIS_PROJECT, view };
}

function normalizeBasemapFlavor(input: unknown): GisBasemapFlavor {
  if (typeof input === "string" && GIS_BASEMAP_FLAVORS.includes(input as GisBasemapFlavor)) {
    return input as GisBasemapFlavor;
  }
  return DEFAULT_GIS_PROJECT.basemapFlavor ?? "light";
}

function normalizeAtmospherePreset(input: unknown): GisAtmospherePreset {
  if (input === "day" || input === "dusk" || input === "deep-space") return input;
  return "day";
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

function resolveGisFog(
  projection: GisProjection,
  preset: GisAtmospherePreset,
): GisProjectFog | undefined {
  if (projection !== "globe") return undefined;
  return { ...GIS_ATMOSPHERE_PRESETS[preset] };
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
