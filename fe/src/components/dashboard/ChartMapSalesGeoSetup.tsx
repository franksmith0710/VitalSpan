import { Button } from "@/components/ui/button";
import { useChartInspector } from "./chartInspectorContext";
import {
  applySalesGeoDrillMapConfig,
  isSalesGeoMapConfig,
  resolveSampleDbDatasource,
} from "@/lib/mapChartSalesGeo";

/** 地图数据：接入 sample_db · v_sales_geo（替代静态演示预设） */
export function ChartMapSalesGeoSetup() {
  const { cfg, onChange, datasourceItems, datasourcesEmpty } = useChartInspector();
  const sampleDs = resolveSampleDbDatasource(datasourceItems);
  const active = isSalesGeoMapConfig(cfg);

  return (
    <div className="space-y-1">
      <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        数据源
      </span>
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        className="h-7 w-full justify-start px-2 text-[10px]"
        onClick={() => onChange(applySalesGeoDrillMapConfig(cfg, sampleDs?.id))}
      >
        接入 sample_db · v_sales_geo（省→市→区县）
      </Button>
      {datasourcesEmpty ? (
        <p className="text-[10px] leading-snug text-amber-600 dark:text-amber-400">
          请先在「数据源」添加 MySQL：127.0.0.1:3307 / sample_db / sample。
        </p>
      ) : !sampleDs ? (
        <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">
          未识别 sample 数据源；点击仍将填入 SQL 与槽位，请手动选择数据源后点「更新图表数据」。
        </p>
      ) : (
        <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">
          将绑定「{sampleDs.name}」；执行 scripts/seed-demo-mysql.ps1 可刷新地理销售数据。
        </p>
      )}
      <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">
        配置后点「更新图表数据」；预览态双击省份可下钻到市/区县（与 2D 地图相同，滚轮仅缩放/旋转当前层）。
      </p>
    </div>
  );
}
