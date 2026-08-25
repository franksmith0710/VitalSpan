import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { DeAxisId } from "@/lib/chartDeAxis";
import { ensureChartSlotCapacity } from "@/components/dashboard/chartFieldSlots";
import {
  isGisFlowEnabled,
  writeGisProject,
} from "@/components/charts/engine/maplibre/gisProject";
import { activeFieldRefs } from "@/lib/chartConfigState";
import {
  fieldAtSlot,
  migrateChartConfigToDeAxes,
  syncLegacyFieldsFromAxes,
  writeAxisField,
} from "@/lib/resolveChartEncoding";

/** sample_db · de_map_od_hubs：全球枢纽 OD（GIS 飞线官方示例） */
export const GIS_MAP_FLOW_SAMPLE_SQL = `SELECT route_name, from_lng, from_lat, to_lng, to_lat, weight
FROM de_map_od_hubs`;

export const DEMO_MAP_FLOW_DATASET_ID = "demo-map-flow";

export const GIS_MAP_OD_CORE_COLUMNS = ["from_lng", "from_lat", "to_lng", "to_lat"] as const;

const LNG_NAME_PATTERN = /(?:^|_)(lng|lon|longitude|经度|x_coord)(?:$|_)/i;
const LAT_NAME_PATTERN = /(?:^|_)(lat|latitude|纬度|y_coord)(?:$|_)/i;
const GEO_NAME_PATTERN =
  /(?:^|_)(region|province|city|district|area|country|state|county|name|route|地区|省份|城市|区县|国家)(?:$|_)/i;

export type GisMapOdFieldSlot = { axisId: DeAxisId; index: number };

const GIS_MAP_OD_FIELD_SLOTS: Record<string, GisMapOdFieldSlot> = {
  from_lng: { axisId: "xAxis", index: 0 },
  from_lat: { axisId: "xAxisExt", index: 0 },
  to_lng: { axisId: "drill", index: 0 },
  to_lat: { axisId: "drill", index: 1 },
  route_name: { axisId: "drill", index: 2 },
  weight: { axisId: "yAxis", index: 0 },
};

export function looksLikeGisLngField(field: string): boolean {
  return LNG_NAME_PATTERN.test(field.trim());
}

export function looksLikeGisLatField(field: string): boolean {
  return LAT_NAME_PATTERN.test(field.trim());
}

export function looksLikeGisGeoLabelField(field: string): boolean {
  const trimmed = field.trim();
  return GEO_NAME_PATTERN.test(trimmed) && !looksLikeGisLngField(trimmed) && !looksLikeGisLatField(trimmed);
}

export function detectGisMapOdColumns(columns: string[]): boolean {
  const set = new Set(columns.map((c) => c.trim()));
  return GIS_MAP_OD_CORE_COLUMNS.every((name) => set.has(name));
}

export function resolveGisMapOdFieldSlot(field: string): GisMapOdFieldSlot | null {
  return GIS_MAP_OD_FIELD_SLOTS[field.trim()] ?? null;
}

export function suggestGisMapOdFields(columns: string[]): {
  dimensions: ChartViewConfig["dimensions"];
  metrics: ChartViewConfig["metrics"];
} | null {
  if (!detectGisMapOdColumns(columns)) return null;
  const set = new Set(columns.map((c) => c.trim()));
  return {
    dimensions: [
      { field: "from_lng" },
      { field: "from_lat" },
      { field: "to_lng" },
      { field: "to_lat" },
      ...(set.has("route_name") ? [{ field: "route_name" }] : []),
    ],
    metrics: set.has("weight") ? [{ field: "weight" }] : [],
  };
}

export function applyGisMapFlowConfig(
  cfg: ChartViewConfig,
  dataSourceId?: string,
  configId?: string,
  columns?: string[],
): ChartViewConfig {
  const withSlots = ensureChartSlotCapacity({
    ...cfg,
    // 散点/手绑后 axes 已存在；migrate 会优先 axes 并覆盖 dimensions，须先清空再写 OD 槽位
    axes: undefined,
    mode: "dataset",
    sql: undefined,
    datasetId: DEMO_MAP_FLOW_DATASET_ID,
    configId: configId ?? cfg.configId,
    dataSourceId: dataSourceId ?? cfg.dataSourceId,
    bindingId: undefined,
    dimensions: [
      { field: "from_lng" },
      { field: "from_lat" },
      { field: "to_lng" },
      { field: "to_lat" },
      { field: "route_name" },
    ],
    metrics: [{ field: "weight" }],
  });
  const bound =
    columns?.length && detectGisMapOdColumns(columns)
      ? applyGisMapOdFieldBindings(withSlots, columns)
      : withSlots;
  return writeGisProject(bound, { flow: { enabled: true } });
}

const GIS_MAP_OD_BINDABLE_FIELDS = [
  ...GIS_MAP_OD_CORE_COLUMNS,
  "route_name",
  "weight",
] as const;

function applyGisMapOdFieldBindings(
  cfg: ChartViewConfig,
  columns: string[],
): ChartViewConfig {
  const columnSet = new Set(columns.map((c) => c.trim()));
  let next = syncLegacyFieldsFromAxes(migrateChartConfigToDeAxes(cfg));
  for (const name of GIS_MAP_OD_BINDABLE_FIELDS) {
    if (!columnSet.has(name)) continue;
    const slot = GIS_MAP_OD_FIELD_SLOTS[name];
    if (!slot || fieldAtSlot(next, slot)) continue;
    next = writeAxisField(next, slot, name);
  }
  return next;
}

function hasPartialGisMapOdBinding(cfg: ChartViewConfig): boolean {
  const synced = syncLegacyFieldsFromAxes(migrateChartConfigToDeAxes(cfg));
  const dims = activeFieldRefs(synced.dimensions);
  const boundCore = GIS_MAP_OD_CORE_COLUMNS.filter((name, index) =>
    Boolean(dims[index]?.field?.trim()),
  ).length;
  return boundCore > 0 && boundCore < GIS_MAP_OD_CORE_COLUMNS.length;
}

/** 列签名匹配 OD 且已绑部分 from/to 槽位时，补齐缺失槽位（不覆盖已有字段） */
export function completeGisMapOdFieldBindingsFromColumns(
  cfg: ChartViewConfig,
  columns: string[],
): ChartViewConfig {
  if (cfg.chartType !== "gis-map") return cfg;
  if (!detectGisMapOdColumns(columns)) return cfg;
  if (isGisMapOdBindingComplete(cfg)) return cfg;
  if (!hasPartialGisMapOdBinding(cfg)) return cfg;
  return ensureGisMapOdFlowEnabled(applyGisMapOdFieldBindings(cfg, columns));
}

export function isGisMapOdBindingComplete(cfg: ChartViewConfig): boolean {
  const dims = activeFieldRefs(
    syncLegacyFieldsFromAxes(migrateChartConfigToDeAxes(cfg)).dimensions,
  );
  return Boolean(
    dims[0]?.field?.trim() &&
      dims[1]?.field?.trim() &&
      dims[2]?.field?.trim() &&
      dims[3]?.field?.trim(),
  );
}

/** 四坐标 OD 槽位齐备时自动开启飞线（避免只绑字段未开 flow.enabled 导致无弧线） */
export function ensureGisMapOdFlowEnabled(cfg: ChartViewConfig): ChartViewConfig {
  if (cfg.chartType !== "gis-map") return cfg;
  const synced = syncLegacyFieldsFromAxes(migrateChartConfigToDeAxes(cfg));
  if (isGisFlowEnabled(synced.nativeBody?.gisProject)) {
    return synced;
  }
  const dims = activeFieldRefs(synced.dimensions);
  const odReady = Boolean(
    dims[0]?.field?.trim() &&
      dims[1]?.field?.trim() &&
      dims[2]?.field?.trim() &&
      dims[3]?.field?.trim(),
  );
  if (!odReady) return synced;
  return writeGisProject(synced, {
    flow: { ...(synced.nativeBody?.gisProject?.flow ?? {}), enabled: true },
  });
}

export function isGisMapFlowConfig(cfg: ChartViewConfig): boolean {
  return (
    cfg.nativeBody?.gisProject?.flow?.enabled === true &&
    (cfg.datasetId === DEMO_MAP_FLOW_DATASET_ID ||
      (cfg.dimensions?.[0]?.field === "from_lng" && cfg.dimensions?.[2]?.field === "to_lng"))
  );
}
