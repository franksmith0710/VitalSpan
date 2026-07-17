import { ChartMapFieldSlots } from "./ChartMapFieldSlots";

/** 对标 DataEase 区域地图 · 数据页签（GEO-IRON-01：仅离线中国，不展示地区选择） */
export function ChartMapDataPanel() {
  return (
    <div className="space-y-3">
      <ChartMapFieldSlots />
    </div>
  );
}
