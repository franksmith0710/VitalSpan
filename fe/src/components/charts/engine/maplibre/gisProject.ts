import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { normalizeBasemapHexColor } from "@/components/charts/engine/maplibre/gisBasemapPalette";
import { DEFAULT_FLOW_ARC_LIFT } from "@/components/charts/engine/maplibre/gisFlowDefaults";

/** gis-map 仅支持管理员登记的全球 PMTiles 外部底图。 */
export type GisBasemapId = "pmtiles";
export type GisLabelLang = "zh-Hans" | "en";
export type GisProjection = "mercator" | "globe";
export type GisBasemapFlavor = "light" | "dark" | "grayscale" | "white" | "black";
export type GisAtmospherePreset = "day" | "night";

export type GisProjectView = {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
};

/** GIS 初始视角各字段合法范围（与 MapLibre 相机一致） */
export const GIS_VIEW_BOUNDS = {
  lng: { min: -180, max: 180 },
  lat: { min: -85, max: 85 },
  zoom: { min: 0, max: 22 },
  bearing: { min: -180, max: 180 },
  pitch: { min: 0, max: 85 },
} as const;

export type GisViewBoundField = keyof typeof GIS_VIEW_BOUNDS;

export const GIS_VIEW_DECIMALS = 2;

export type GisViewDraftFields = {
  centerLng: string;
  centerLat: string;
  zoom: string;
  bearing: string;
  pitch: string;
};

export function clampGisViewScalar(field: GisViewBoundField, value: number): number {
  const { min, max } = GIS_VIEW_BOUNDS[field];
  return Number(Math.min(max, Math.max(min, value)).toFixed(GIS_VIEW_DECIMALS));
}

export function formatGisViewScalar(value: number, decimals = GIS_VIEW_DECIMALS): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(decimals);
}

export function formatGisViewDraftFromView(view: GisProjectView): GisViewDraftFields {
  return {
    centerLng: formatGisViewScalar(view.center[0]),
    centerLat: formatGisViewScalar(view.center[1]),
    zoom: formatGisViewScalar(view.zoom),
    bearing: formatGisViewScalar(view.bearing ?? 0),
    pitch: formatGisViewScalar(view.pitch ?? 0),
  };
}

export function finalizeGisViewDraftField(
  field: keyof GisViewDraftFields,
  raw: string,
): string {
  if (raw.trim() === "") return raw;
  const num = Number(raw);
  if (!Number.isFinite(num)) return raw;
  const boundField: GisViewBoundField =
    field === "centerLng" ? "lng" : field === "centerLat" ? "lat" : field;
  return formatGisViewScalar(clampGisViewScalar(boundField, num));
}

export function parseGisViewDraft(draft: GisViewDraftFields): GisProjectView | null {
  if (
    draft.centerLng.trim() === "" ||
    draft.centerLat.trim() === "" ||
    draft.zoom.trim() === "" ||
    draft.bearing.trim() === "" ||
    draft.pitch.trim() === ""
  ) {
    return null;
  }
  const lng = Number(draft.centerLng);
  const lat = Number(draft.centerLat);
  const zoom = Number(draft.zoom);
  const bearing = Number(draft.bearing);
  const pitch = Number(draft.pitch);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(zoom)) return null;
  if (!Number.isFinite(bearing) || !Number.isFinite(pitch)) return null;
  if (lng < GIS_VIEW_BOUNDS.lng.min || lng > GIS_VIEW_BOUNDS.lng.max) return null;
  if (lat < GIS_VIEW_BOUNDS.lat.min || lat > GIS_VIEW_BOUNDS.lat.max) return null;
  if (zoom < GIS_VIEW_BOUNDS.zoom.min || zoom > GIS_VIEW_BOUNDS.zoom.max) return null;
  if (bearing < GIS_VIEW_BOUNDS.bearing.min || bearing > GIS_VIEW_BOUNDS.bearing.max) return null;
  if (pitch < GIS_VIEW_BOUNDS.pitch.min || pitch > GIS_VIEW_BOUNDS.pitch.max) return null;
  return normalizeGisProjectView({
    center: [lng, lat],
    zoom,
    bearing,
    pitch,
  });
}

export function normalizeGisProjectView(view: GisProjectView): GisProjectView {
  return {
    center: [clampGisViewScalar("lng", view.center[0]), clampGisViewScalar("lat", view.center[1])],
    zoom: clampGisViewScalar("zoom", view.zoom),
    bearing: clampGisViewScalar("bearing", view.bearing ?? 0),
    pitch: clampGisViewScalar("pitch", view.pitch ?? 0),
  };
}

export type GisProjectFog = {
  color?: string;
  "high-color"?: string;
  "horizon-blend"?: number;
  "space-color"?: string;
  "star-intensity"?: number;
};

export type GisBasemapLayerVisibility = {
  /** 道路网络（含铁路、桥梁、隧道） */
  roads?: boolean;
  /** 地名、道路名、POI 等文字标注 */
  labels?: boolean;
  /** 国界/省界等边界线 */
  boundaries?: boolean;
  /** 绿地、工业用地等 landcover/landuse 细分 */
  landDetail?: boolean;
};

export type GisProjectOverlay = {
  /** 散点填充色；缺省取图表 palette 首色 */
  color?: string;
  /** 圆点半径下限（px） */
  radiusMin?: number;
  /** 圆点半径上限（px） */
  radiusMax?: number;
  /** 圆点不透明度 0–1 */
  opacity?: number;
  /** 是否显示散点标签 */
  showLabels?: boolean;
  /** 低于该 zoom 不显示标签 */
  labelMinZoom?: number;
  /** 是否按指标值缩放圆点大小 */
  scaleByMetric?: boolean;
  /** 描边色 */
  strokeColor?: string;
  /** 描边宽度（px） */
  strokeWidth?: number;
  /** 有散点时自动 fitBounds（首次或数据变更） */
  autoFit?: boolean;
  /** 低 zoom 聚合散点 */
  cluster?: boolean;
  /** 聚合停止的最大 zoom */
  clusterMaxZoom?: number;
  /** 按标签/类别字段分色（palette） */
  colorByCategory?: boolean;
};

export type GisProjectFlow = {
  /** 开启 OD 飞线（槽位语义切换为起点/终点经纬度） */
  enabled?: boolean;
  /** 弧线颜色；缺省取图表 palette 首色 */
  color?: string;
  /** 线宽下限（px） */
  widthMin?: number;
  /** 线宽上限（px） */
  widthMax?: number;
  /** 线不透明度 0–1 */
  opacity?: number;
  /** 按流量指标缩放线宽 */
  scaleByMetric?: boolean;
  /** 有飞线时自动 fitBounds */
  autoFit?: boolean;
  /** 流动光点与枢纽呼吸动画；默认开启 */
  animate?: boolean;
  /** 拱形高度 0.2–1.2；越大弧线越弯（仅影响 GeoJSON 路径） */
  arcLift?: number;
};

export type GisProject = {
  basemap: GisBasemapId;
  tileServiceId?: string;
  labelLang?: GisLabelLang;
  basemapFlavor?: GisBasemapFlavor;
  /** 覆写 Protomaps 陆地底色（earth 层），如 #e2dfda */
  landColor?: string;
  /** 覆写 Protomaps 海洋/水体色（water 层），如 #80deea */
  waterColor?: string;
  /** 控制底图矢量图层显隐；缺省均为显示 */
  basemapLayers?: GisBasemapLayerVisibility;
  projection?: GisProjection;
  atmospherePreset?: GisAtmospherePreset;
  fog?: GisProjectFog;
  view?: GisProjectView;
  /** 球面模式下慢速自转（大屏待机） */
  autoRotate?: boolean;
  /** 自转速度（度/秒）；默认大屏慢速 ≈8 分钟/圈 */
  autoRotateSpeed?: number;
  /** 显示缩放/罗盘/比例尺控件 */
  showControls?: boolean;
  /** 矢量底图建筑 3D 挤出（高 zoom） */
  buildings3d?: boolean;
  /** 地球表面（矢量底图）不透明度 0–1，默认 1；不影响星空/大气 */
  earthOpacity?: number;
  /** 经纬度散点叠加样式 */
  overlay?: GisProjectOverlay;
  /** 全球 OD 飞线叠加 */
  flow?: GisProjectFlow;
};

export const DEFAULT_GIS_OVERLAY: Required<
  Pick<
    GisProjectOverlay,
    | "radiusMin"
    | "radiusMax"
    | "opacity"
    | "showLabels"
    | "labelMinZoom"
    | "scaleByMetric"
    | "strokeColor"
    | "strokeWidth"
    | "autoFit"
    | "cluster"
    | "clusterMaxZoom"
    | "colorByCategory"
  >
> = {
  radiusMin: 4,
  radiusMax: 14,
  opacity: 0.75,
  showLabels: true,
  labelMinZoom: 4,
  scaleByMetric: true,
  strokeColor: "#ffffff",
  strokeWidth: 1,
  autoFit: true,
  cluster: true,
  clusterMaxZoom: 12,
  colorByCategory: true,
};

const DEFAULT_GIS_OVERLAY_COLOR = "#2563eb";

export const DEFAULT_GIS_FLOW: Required<
  Pick<GisProjectFlow, "widthMin" | "widthMax" | "opacity" | "scaleByMetric" | "autoFit" | "arcLift">
> = {
  widthMin: 4,
  widthMax: 14,
  opacity: 0.95,
  scaleByMetric: true,
  autoFit: true,
  arcLift: DEFAULT_FLOW_ARC_LIFT,
};

export type ResolvedGisFlowStyle = {
  enabled: boolean;
  color: string;
  widthMin: number;
  widthMax: number;
  opacity: number;
  scaleByMetric: boolean;
  autoFit: boolean;
  animate: boolean;
  arcLift: number;
};

export function isGisFlowEnabled(project: GisProject | undefined | null): boolean {
  return project?.flow?.enabled === true;
}

export function resolveGisFlowStyle(
  flow: GisProjectFlow | undefined,
  chartColors?: string[],
): ResolvedGisFlowStyle {
  const widthMinRaw = Number(flow?.widthMin);
  const widthMaxRaw = Number(flow?.widthMax);
  const widthMin =
    Number.isFinite(widthMinRaw) && widthMinRaw >= 0 ? widthMinRaw : DEFAULT_GIS_FLOW.widthMin;
  const widthMax =
    Number.isFinite(widthMaxRaw) && widthMaxRaw >= widthMin ? widthMaxRaw : DEFAULT_GIS_FLOW.widthMax;
  const opacityRaw = Number(flow?.opacity);
  const opacity =
    Number.isFinite(opacityRaw) && opacityRaw >= 0 && opacityRaw <= 1
      ? opacityRaw
      : DEFAULT_GIS_FLOW.opacity;
  const color =
    typeof flow?.color === "string" && flow.color.trim()
      ? flow.color.trim()
      : chartColors?.[0] ?? "#f97316";
  const arcLiftRaw = Number(flow?.arcLift);
  const arcLift =
    Number.isFinite(arcLiftRaw) && arcLiftRaw >= 0.15 && arcLiftRaw <= 1.5
      ? arcLiftRaw
      : DEFAULT_GIS_FLOW.arcLift;
  return {
    enabled: flow?.enabled === true,
    color,
    widthMin,
    widthMax,
    opacity,
    scaleByMetric: flow?.scaleByMetric !== false,
    autoFit: flow?.autoFit !== false,
    animate: flow?.animate !== false,
    arcLift,
  };
}

export type ResolvedGisOverlayStyle = {
  color: string;
  radiusMin: number;
  radiusMax: number;
  opacity: number;
  showLabels: boolean;
  labelMinZoom: number;
  scaleByMetric: boolean;
  strokeColor: string;
  strokeWidth: number;
  autoFit: boolean;
  cluster: boolean;
  clusterMaxZoom: number;
  colorByCategory: boolean;
};

export function resolveGisOverlayStyle(
  overlay: GisProjectOverlay | undefined,
  chartColors?: string[],
): ResolvedGisOverlayStyle {
  const radiusMinRaw = Number(overlay?.radiusMin);
  const radiusMaxRaw = Number(overlay?.radiusMax);
  const radiusMin =
    Number.isFinite(radiusMinRaw) && radiusMinRaw >= 0 ? radiusMinRaw : DEFAULT_GIS_OVERLAY.radiusMin;
  const radiusMax =
    Number.isFinite(radiusMaxRaw) && radiusMaxRaw >= radiusMin
      ? radiusMaxRaw
      : Math.max(radiusMin, DEFAULT_GIS_OVERLAY.radiusMax);
  const opacityRaw = Number(overlay?.opacity);
  const opacity =
    Number.isFinite(opacityRaw) && opacityRaw >= 0 && opacityRaw <= 1
      ? opacityRaw
      : DEFAULT_GIS_OVERLAY.opacity;
  const labelMinZoomRaw = Number(overlay?.labelMinZoom);
  const labelMinZoom =
    Number.isFinite(labelMinZoomRaw) && labelMinZoomRaw >= 0
      ? labelMinZoomRaw
      : DEFAULT_GIS_OVERLAY.labelMinZoom;
  const strokeWidthRaw = Number(overlay?.strokeWidth);
  const strokeWidth =
    Number.isFinite(strokeWidthRaw) && strokeWidthRaw >= 0
      ? strokeWidthRaw
      : DEFAULT_GIS_OVERLAY.strokeWidth;
  const color =
    typeof overlay?.color === "string" && overlay.color.trim()
      ? overlay.color.trim()
      : chartColors?.[0]?.trim() || DEFAULT_GIS_OVERLAY_COLOR;
  const strokeColor =
    typeof overlay?.strokeColor === "string" && overlay.strokeColor.trim()
      ? overlay.strokeColor.trim()
      : DEFAULT_GIS_OVERLAY.strokeColor;
  const clusterMaxZoomRaw = Number(overlay?.clusterMaxZoom);
  const clusterMaxZoom =
    Number.isFinite(clusterMaxZoomRaw) && clusterMaxZoomRaw >= 0
      ? clusterMaxZoomRaw
      : DEFAULT_GIS_OVERLAY.clusterMaxZoom;
  return {
    color,
    radiusMin,
    radiusMax,
    opacity,
    showLabels: overlay?.showLabels !== false,
    labelMinZoom,
    scaleByMetric: overlay?.scaleByMetric !== false,
    strokeColor,
    strokeWidth,
    autoFit: overlay?.autoFit !== false,
    cluster: overlay?.cluster !== false,
    clusterMaxZoom,
    colorByCategory: overlay?.colorByCategory !== false,
  };
}

/** 本地/演示默认登记的全球 PMTiles 服务（运维 register 脚本同名 id）。 */
export const DEFAULT_PMTILES_TILE_SERVICE_ID = "planet-z15";

export const GIS_BASEMAP_FLAVORS: GisBasemapFlavor[] = ["light", "dark", "grayscale", "white", "black"];

/** MapLibre 球面地球默认大气（黑夜星空，接近 GeoLibre 球面观感）。 */
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
  night: DEFAULT_GLOBE_FOG,
};

export const GIS_ATMOSPHERE_PRESET_ORDER: GisAtmospherePreset[] = ["day", "night"];

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
  atmospherePreset: "night",
  fog: GIS_ATMOSPHERE_PRESETS.night,
  view: DEFAULT_GIS_GLOBE_VIEW,
  buildings3d: true,
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
  const earthOpacityRaw = Number(
    candidate.earthOpacity ?? (candidate as { mapOpacity?: number }).mapOpacity,
  );
  const landColor = normalizeBasemapHexColor(candidate.landColor);
  const waterColor = normalizeBasemapHexColor(candidate.waterColor);
  const basemapLayers = normalizeBasemapLayerVisibility(candidate.basemapLayers);
  const overlay = normalizeGisProjectOverlay(candidate.overlay);
  const flow = normalizeGisProjectFlow(candidate.flow);
  return {
    basemap: "pmtiles",
    tileServiceId,
    labelLang,
    basemapFlavor,
    landColor,
    waterColor,
    basemapLayers,
    projection,
    atmospherePreset: projection === "globe" ? atmospherePreset : undefined,
    fog,
    view,
    autoRotate: candidate.autoRotate === true,
    autoRotateSpeed: Number.isFinite(autoRotateSpeed) && autoRotateSpeed > 0 ? autoRotateSpeed : undefined,
    showControls: candidate.showControls === true,
    buildings3d: candidate.buildings3d !== false,
    earthOpacity:
      Number.isFinite(earthOpacityRaw) && earthOpacityRaw >= 0 && earthOpacityRaw <= 1
        ? earthOpacityRaw
        : undefined,
    overlay,
    flow,
  };
}

function normalizeGisProjectFlow(input: unknown): GisProjectFlow | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as GisProjectFlow;
  const next: GisProjectFlow = {};
  if (raw.enabled === true) next.enabled = true;
  if (typeof raw.color === "string" && raw.color.trim()) next.color = raw.color.trim();
  const widthMin = Number(raw.widthMin);
  if (Number.isFinite(widthMin) && widthMin >= 0) next.widthMin = widthMin;
  const widthMax = Number(raw.widthMax);
  if (Number.isFinite(widthMax) && widthMax >= 0) next.widthMax = widthMax;
  const opacity = Number(raw.opacity);
  if (Number.isFinite(opacity) && opacity >= 0 && opacity <= 1) next.opacity = opacity;
  if (raw.scaleByMetric === false) next.scaleByMetric = false;
  if (raw.autoFit === false) next.autoFit = false;
  if (raw.animate === false) next.animate = false;
  const arcLift = Number(raw.arcLift);
  if (Number.isFinite(arcLift) && arcLift >= 0.15 && arcLift <= 1.5) next.arcLift = arcLift;
  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeGisProjectOverlay(input: unknown): GisProjectOverlay | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as GisProjectOverlay;
  const next: GisProjectOverlay = {};
  if (typeof raw.color === "string" && raw.color.trim()) next.color = raw.color.trim();
  const radiusMin = Number(raw.radiusMin);
  if (Number.isFinite(radiusMin) && radiusMin >= 0) next.radiusMin = radiusMin;
  const radiusMax = Number(raw.radiusMax);
  if (Number.isFinite(radiusMax) && radiusMax >= 0) next.radiusMax = radiusMax;
  const opacity = Number(raw.opacity);
  if (Number.isFinite(opacity) && opacity >= 0 && opacity <= 1) next.opacity = opacity;
  if (raw.showLabels === false) next.showLabels = false;
  const labelMinZoom = Number(raw.labelMinZoom);
  if (Number.isFinite(labelMinZoom) && labelMinZoom >= 0) next.labelMinZoom = labelMinZoom;
  if (raw.scaleByMetric === false) next.scaleByMetric = false;
  if (typeof raw.strokeColor === "string" && raw.strokeColor.trim()) {
    next.strokeColor = raw.strokeColor.trim();
  }
  const strokeWidth = Number(raw.strokeWidth);
  if (Number.isFinite(strokeWidth) && strokeWidth >= 0) next.strokeWidth = strokeWidth;
  if (raw.autoFit === false) next.autoFit = false;
  if (raw.cluster === false) next.cluster = false;
  const clusterMaxZoom = Number(raw.clusterMaxZoom);
  if (Number.isFinite(clusterMaxZoom) && clusterMaxZoom >= 0) next.clusterMaxZoom = clusterMaxZoom;
  if (raw.colorByCategory === false) next.colorByCategory = false;
  return Object.keys(next).length > 0 ? next : undefined;
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

function normalizeBasemapLayerVisibility(input: unknown): GisBasemapLayerVisibility | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as GisBasemapLayerVisibility;
  const next: GisBasemapLayerVisibility = {};
  if (raw.roads === false) next.roads = false;
  if (raw.labels === false) next.labels = false;
  if (raw.boundaries === false) next.boundaries = false;
  if (raw.landDetail === false) next.landDetail = false;
  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeAtmospherePreset(input: unknown): GisAtmospherePreset {
  if (input === "day" || input === "night") return input;
  if (input === "dusk" || input === "deep-space") return "night";
  return DEFAULT_GIS_PROJECT.atmospherePreset ?? "night";
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
  const normalized = normalizeGisProjectView({
    center: [lng, lat],
    zoom,
    bearing: Number.isFinite(bearing) ? bearing : 0,
    pitch: Number.isFinite(pitch) ? pitch : 0,
  });
  return {
    center: normalized.center,
    zoom: normalized.zoom,
    bearing: Number.isFinite(bearing) ? normalized.bearing : undefined,
    pitch: Number.isFinite(pitch) ? normalized.pitch : undefined,
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
