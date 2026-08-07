import { Button } from "@/components/ui/button";
import { useChartInspector } from "./chartInspectorContext";
import {
  applySalesGeoDrillMapConfig,
  isSalesGeoMapConfig,
  resolveSampleDbDatasource,
} from "@/lib/mapChartSalesGeo";

/** 地图数据：接入 sample_db · v_sales_geo（替代静态演示预设） */
export function ChartMapSalesGeoSetup() {
  const { cfg, onChange, datasourceItems } = useChartInspector();
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
    </div>
  );
}
