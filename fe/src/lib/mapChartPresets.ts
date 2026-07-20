import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { ensureChartSlotCapacity } from "@/components/dashboard/chartFieldSlots";
import { DEMO_MAP_DRILL_SQL, DEMO_MAP_JOIN_SQL, DEMO_MAP_SALES_DRILL_SQL } from "@/lib/mapChartDataHint";

export type MapDataPresetId = "demo-sales-province" | "demo-sales-drill" | "demo-drill-sql";

export const MAP_DATA_PRESET_LABELS: Record<MapDataPresetId, string> = {
  "demo-sales-province": "省级 · 演示库",
  "demo-sales-drill": "省→市→区县 · 演示库 sales",
  "demo-drill-sql": "省→市→区县 · 静态示例",
};

/** 对标 DataEase：地图数据快捷配置 */
export function applyMapDataPreset(
  cfg: ChartViewConfig,
  preset: MapDataPresetId,
): ChartViewConfig {
  if (preset === "demo-sales-province") {
    return ensureChartSlotCapacity({
      ...cfg,
      mode: "sql",
      sql: DEMO_MAP_JOIN_SQL,
      datasetId: undefined,
      configId: undefined,
      dimensions: [{ field: "region" }, { field: "" }, { field: "" }],
      metrics: [{ field: "total" }],
    });
  }

  if (preset === "demo-sales-drill") {
    return ensureChartSlotCapacity({
      ...cfg,
      mode: "sql",
      sql: DEMO_MAP_SALES_DRILL_SQL,
      datasetId: undefined,
      configId: undefined,
      dimensions: [{ field: "province" }, { field: "city" }, { field: "district" }],
      metrics: [{ field: "total" }],
    });
  }

  return ensureChartSlotCapacity({
    ...cfg,
    mode: "sql",
    sql: DEMO_MAP_DRILL_SQL,
    datasetId: undefined,
    configId: undefined,
    dimensions: [{ field: "province" }, { field: "city" }, { field: "district" }],
    metrics: [{ field: "total" }],
  });
}

/** 演示库 sales 表：仅省级 region_id，不换 SQL */
export function applyDemoSalesRegionIdMap(cfg: ChartViewConfig): ChartViewConfig {
  return ensureChartSlotCapacity({
    ...cfg,
    dimensions: [{ field: "region_id" }, { field: "" }, { field: "" }],
    metrics: [{ field: "amount" }],
  });
}

export function detectMapDataPreset(cfg: ChartViewConfig): MapDataPresetId | null {
  const dims = cfg.dimensions?.map((d) => d.field?.trim()).filter(Boolean) ?? [];
  if (dims[0] === "province" && dims[1] === "city") {
    if (cfg.sql?.includes("v_sales_geo")) return "demo-sales-drill";
    return "demo-drill-sql";
  }
  if (dims[0] === "region" && cfg.sql?.includes("v_sales_geo")) return "demo-sales-province";
  return null;
}
