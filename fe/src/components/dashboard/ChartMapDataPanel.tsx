import { ChartMapFieldSlots } from "./ChartMapFieldSlots";
import { ChartMapSalesGeoSetup } from "./ChartMapSalesGeoSetup";
import { MapChartFieldHintBanner } from "./MapChartFieldHint";
import { useChartInspector } from "./chartInspectorContext";
import { mapChartFieldHint } from "@/lib/mapChartDataHint";

/** 对标 DataEase 区域地图 · 数据页签（GEO-IRON-01：仅离线中国，不展示地区选择） */
export function ChartMapDataPanel() {
  const { columns } = useChartInspector();
  const mapHint = mapChartFieldHint(columns);

  return (
    <div className="space-y-3">
      <ChartMapSalesGeoSetup />
      {mapHint ? <MapChartFieldHintBanner hint={mapHint} /> : null}
      <ChartMapFieldSlots />
    </div>
  );
}
