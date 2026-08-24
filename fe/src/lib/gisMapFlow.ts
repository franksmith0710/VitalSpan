import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { ensureChartSlotCapacity } from "@/components/dashboard/chartFieldSlots";
import { writeGisProject } from "@/components/charts/engine/maplibre/gisProject";

/** 全球枢纽 OD 示例（SQL 模式，无需新表） */
export const GIS_MAP_FLOW_SAMPLE_SQL = `SELECT route_name, from_lng, from_lat, to_lng, to_lat, weight
FROM (
  SELECT '上海 → 洛杉矶' AS route_name, 121.47 AS from_lng, 31.23 AS from_lat, -118.24 AS to_lng, 34.05 AS to_lat, 920 AS weight
  UNION ALL SELECT '北京 → 伦敦', 116.40, 39.90, -0.12, 51.51, 780
  UNION ALL SELECT '广州 → 新加坡', 113.26, 23.13, 103.85, 1.29, 640
  UNION ALL SELECT '法兰克福 → 纽约', 8.68, 50.11, -74.01, 40.71, 710
  UNION ALL SELECT '悉尼 → 东京', 151.21, -33.87, 139.69, 35.68, 530
  UNION ALL SELECT '迪拜 → 巴黎', 55.27, 25.20, 2.35, 48.86, 490
) od_routes`;

export function applyGisMapFlowConfig(cfg: ChartViewConfig, dataSourceId?: string): ChartViewConfig {
  const withSlots = ensureChartSlotCapacity({
    ...cfg,
    // 散点/手绑后 axes 已存在；migrate 会优先 axes 并覆盖 dimensions，须先清空再写 OD 槽位
    axes: undefined,
    mode: "sql",
    sql: GIS_MAP_FLOW_SAMPLE_SQL,
    datasetId: undefined,
    configId: undefined,
    bindingId: undefined,
    dataSourceId: dataSourceId ?? cfg.dataSourceId,
    dimensions: [
      { field: "from_lng" },
      { field: "from_lat" },
      { field: "to_lng" },
      { field: "to_lat" },
      { field: "route_name" },
    ],
    metrics: [{ field: "weight" }],
  });
  return writeGisProject(withSlots, { flow: { enabled: true } });
}

export function isGisMapFlowConfig(cfg: ChartViewConfig): boolean {
  return (
    cfg.nativeBody?.gisProject?.flow?.enabled === true &&
    cfg.dimensions?.[0]?.field === "from_lng" &&
    cfg.dimensions?.[2]?.field === "to_lng"
  );
}
