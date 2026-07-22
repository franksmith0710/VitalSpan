import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { ensureChartSlotCapacity } from "@/components/dashboard/chartFieldSlots";

/** sample_db 三级地图：省→市→区县下钻（需 v_sales_geo 视图） */
export const SALES_GEO_DRILL_SQL = `SELECT province, city, district, SUM(amount) AS total
FROM v_sales_geo
GROUP BY province, city, district`;

/** sample_db 省级聚合（单维度 region 槽位） */
export const SALES_GEO_PROVINCE_SQL = `SELECT province AS region, SUM(amount) AS total
FROM v_sales_geo
GROUP BY province`;

export type SampleDatasourceItem = { id: string; name: string; code: string };

/** 从已登记数据源中匹配 docker sample-mysql / sample_db */
export function resolveSampleDbDatasource(
  items: SampleDatasourceItem[],
): SampleDatasourceItem | null {
  const score = (ds: SampleDatasourceItem): number => {
    const hay = `${ds.code} ${ds.name}`.toLowerCase();
    if (/sample_db|sample-mysql|demo-mysql/.test(hay)) return 3;
    if (/\bsample\b/.test(hay)) return 2;
    if (/3307/.test(hay)) return 1;
    return 0;
  };
  const ranked = items
    .map((ds) => ({ ds, s: score(ds) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.ds ?? null;
}

/** 一键配置 SQL + 槽位，可选绑定 sample 数据源 */
export function applySalesGeoDrillMapConfig(
  cfg: ChartViewConfig,
  dataSourceId?: string,
): ChartViewConfig {
  return ensureChartSlotCapacity({
    ...cfg,
    mode: "sql",
    sql: SALES_GEO_DRILL_SQL,
    dataSourceId: dataSourceId ?? cfg.dataSourceId,
    datasetId: undefined,
    configId: undefined,
    dimensions: [{ field: "province" }, { field: "city" }, { field: "district" }],
    metrics: [{ field: "total" }],
  });
}

export function isSalesGeoMapConfig(cfg: ChartViewConfig): boolean {
  const dims = cfg.dimensions?.map((d) => d.field?.trim()) ?? [];
  return (
    dims[0] === "province" &&
    dims[1] === "city" &&
    dims[2] === "district" &&
    Boolean(cfg.sql?.includes("v_sales_geo"))
  );
}
