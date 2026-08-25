import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { ensureChartSlotCapacity } from "@/components/dashboard/chartFieldSlots";
import { writeGisProject } from "@/components/charts/engine/maplibre/gisProject";

/** sample_db · de_map_od_hubs：全球枢纽 OD（GIS 飞线官方示例） */
export const GIS_MAP_FLOW_SAMPLE_SQL = `SELECT route_name, from_lng, from_lat, to_lng, to_lat, weight
FROM de_map_od_hubs`;

export const DEMO_MAP_FLOW_DATASET_ID = "demo-map-flow";

export function applyGisMapFlowConfig(
  cfg: ChartViewConfig,
  dataSourceId?: string,
  configId?: string,
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
  return writeGisProject(withSlots, { flow: { enabled: true } });
}

export function isGisMapFlowConfig(cfg: ChartViewConfig): boolean {
  return (
    cfg.nativeBody?.gisProject?.flow?.enabled === true &&
    (cfg.datasetId === DEMO_MAP_FLOW_DATASET_ID ||
      (cfg.dimensions?.[0]?.field === "from_lng" && cfg.dimensions?.[2]?.field === "to_lng"))
  );
}
