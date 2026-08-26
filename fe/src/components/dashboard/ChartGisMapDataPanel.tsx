import { ChartDataSlots } from "./ChartDataSlots";
import { ChartGisMapScatterSetup } from "./ChartGisMapScatterSetup";
import { GisMapDataHintBanner } from "./GisMapDataHintBanner";
import { useChartInspector } from "./chartInspectorContext";
import { resolveGisMapDataHint } from "@/lib/gisMapDataHint";

/** GIS 地图 · 数据页签：底图可空载 + 可选经纬度散点 */
export function ChartGisMapDataPanel() {
  const { cfg, columns } = useChartInspector();
  const hint = resolveGisMapDataHint(cfg, columns);

  return (
    <div className="space-y-2" data-testid="chart-gis-map-data-panel">
      <GisMapDataHintBanner hint={hint} />
      <ChartGisMapScatterSetup />
      <ChartDataSlots hideMapHint />
    </div>
  );
}
