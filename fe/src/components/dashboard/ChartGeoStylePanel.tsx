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
    <DashboardConfigSection
      title={chartType === "map" ? "地图样式" : "热力图样式"}
      compact
    >
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
        {chartType === "heatmap" ? (
          <InspectorSwitchRow
            label="单元格数值"
            checked={geo.showCellLabel === true}
            onCheckedChange={(showCellLabel) => patchGeo({ showCellLabel })}
          />
        ) : null}
        <InspectorSwitchRow
          label="数值色带"
          checked={geo.visualMap !== false}
          onCheckedChange={(visualMap) => patchGeo({ visualMap })}
        />
        <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
          {chartType === "map"
            ? "离线中国地图：配置「地区/维度」「数据/指标」与「钻取/维度」，预览态点击地图下钻。"
            : "对标 DataEase 分类热力图：横轴、纵轴各一维度，指标决定色深；重复单元格自动求和。"}
        </p>
      </div>
    </DashboardConfigSection>
  );
}
