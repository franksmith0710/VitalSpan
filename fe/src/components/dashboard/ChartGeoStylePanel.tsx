import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { patchChartDeStyleNested } from "@/lib/chartDeStyle";
import { readChartGeoStyle, type ChartDeStyle } from "@/lib/chartDeStyle";
import { DashboardConfigSection } from "./DashboardConfigSection";
import { INSPECTOR_SECTION_GAP, InspectorSwitchRow } from "./inspectorCompact";

type ChartGeoStylePanelProps = {
  cfg: ChartViewConfig;
  deStyle: ChartDeStyle;
  chartType: "map" | "heatmap";
  onChange: (cfg: ChartViewConfig) => void;
};

/** DataEase 对标：地图/热力图专属样式 */
export function ChartGeoStylePanel({ cfg, deStyle, chartType, onChange }: ChartGeoStylePanelProps) {
  const geo = readChartGeoStyle(deStyle);
  const patchGeo = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "geo", patch));

  return (
    <DashboardConfigSection title="地图样式" defaultOpen compact>
      <div className={INSPECTOR_SECTION_GAP}>
        {chartType === "map" ? (
          <InspectorSwitchRow
            label="缩放平移"
            checked={geo.roam !== false}
            onCheckedChange={(roam) => patchGeo({ roam })}
          />
        ) : null}
        {chartType === "map" ? (
          <InspectorSwitchRow
            label="区域标签"
            checked={geo.showRegionLabel === true}
            onCheckedChange={(showRegionLabel) => patchGeo({ showRegionLabel })}
          />
        ) : null}
        <InspectorSwitchRow
          label="数值色带"
          checked={geo.visualMap !== false}
          onCheckedChange={(visualMap) => patchGeo({ visualMap })}
        />
        <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
          离线中国省级底图（GEO-IRON-01）。地理维度支持「北京」「北京市」「广东省」及 adcode；须为地名，不可用 region_id。
        </p>
      </div>
    </DashboardConfigSection>
  );
}
