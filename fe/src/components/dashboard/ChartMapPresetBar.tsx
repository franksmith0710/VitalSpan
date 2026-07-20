import { Button } from "@/components/ui/button";
import { useChartInspector } from "./chartInspectorContext";
import {
  applyMapDataPreset,
  detectMapDataPreset,
  MAP_DATA_PRESET_LABELS,
  type MapDataPresetId,
} from "@/lib/mapChartPresets";

const PRESET_ORDER: MapDataPresetId[] = [
  "demo-sales-drill",
  "demo-sales-province",
  "demo-drill-sql",
];

/** 对标 DataEase：地图数据快捷预设（SQL + 槽位一键填充） */
export function ChartMapPresetBar() {
  const { cfg, onChange } = useChartInspector();
  const active = detectMapDataPreset(cfg);

  return (
    <div className="space-y-1">
      <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        数据预设
      </span>
      <div className="flex flex-wrap gap-1">
        {PRESET_ORDER.map((presetId) => (
          <Button
            key={presetId}
            type="button"
            variant={active === presetId ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => onChange(applyMapDataPreset(cfg, presetId))}
          >
            {MAP_DATA_PRESET_LABELS[presetId]}
          </Button>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">
        对标 DataEase：先选预设再点「更新图表数据」；预览态点击地图下钻。
      </p>
    </div>
  );
}
