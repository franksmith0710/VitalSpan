import { Button } from "@/components/ui/button";
import { useChartInspector } from "./chartInspectorContext";
import { applyGisMapFlowConfig, isGisMapFlowConfig } from "@/lib/gisMapFlow";
import { resolveSampleDbDatasource } from "@/lib/gisMapScatter";

const GIS_FLOW_SETUP_LABEL = "接入 demo-map-flow · de_map_od_hubs（全球枢纽 OD）";

export function ChartGisMapFlowSetup() {
  const { cfg, onChange, datasourceItems } = useChartInspector();
  const sampleDs = resolveSampleDbDatasource(datasourceItems);
  const active = isGisMapFlowConfig(cfg);

  return (
    <div className="space-y-1">
      <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">OD 飞线示例</span>
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        className="h-7 w-full min-w-0 justify-start overflow-hidden px-2 text-[10px]"
        title={GIS_FLOW_SETUP_LABEL}
        onClick={() => onChange(applyGisMapFlowConfig(cfg, sampleDs?.id))}
      >
        <span className="min-w-0 truncate">{GIS_FLOW_SETUP_LABEL}</span>
      </Button>
    </div>
  );
}
