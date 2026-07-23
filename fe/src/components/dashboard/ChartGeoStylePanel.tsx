import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  DEFAULT_GEO3D_EXTRUDE_INTENSITY,
  patchChartDeStyleNested,
  readChartGeoStyle,
  readChartGeo3dStyle,
  type ChartDeStyle,
} from "@/lib/chartDeStyle";
import { DashboardConfigSection } from "./DashboardConfigSection";
import { INSPECTOR_HINT, INSPECTOR_SECTION_GAP, InspectorFieldRow, InspectorSwitchRow } from "./inspectorCompact";

type ChartGeoStylePanelProps = {
  cfg: ChartViewConfig;
  deStyle: ChartDeStyle;
  chartType: "map" | "map-3d" | "heatmap";
  onChange: (cfg: ChartViewConfig) => void;
};

const QUALITY_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "high", label: "高（全国/省级）" },
  { value: "medium", label: "中（市级）" },
  { value: "low", label: "低（优先 2D）" },
] as const;

/** DataEase 对标：地图/热力图专属样式 */
export function ChartGeoStylePanel({ cfg, deStyle, chartType, onChange }: ChartGeoStylePanelProps) {
  const geo = readChartGeoStyle(deStyle);
  const geo3d = readChartGeo3dStyle(deStyle);
  const patchGeo = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "geo", patch));
  const patchGeo3d = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "geo3d", patch));
  const isMap = chartType === "map" || chartType === "map-3d";
  const is3d = chartType === "map-3d";

  return (
    <DashboardConfigSection title={isMap ? "地图样式" : "热力图样式"} compact>
      <div className={INSPECTOR_SECTION_GAP}>
        {isMap ? (
          <InspectorSwitchRow
            label="缩放平移"
            checked={geo.roam !== false}
            onCheckedChange={(roam) => patchGeo({ roam })}
          />
        ) : null}
        {isMap && chartType === "map" ? (
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
        {is3d ? (
          <p className={INSPECTOR_HINT}>3D 地图暂不支持区域名称标签，请切换 2D 地图或依赖 Tooltip。</p>
        ) : null}
        <InspectorSwitchRow
          label="数值色带"
          checked={geo.visualMap !== false}
          onCheckedChange={(visualMap) => patchGeo({ visualMap })}
        />
        {is3d ? (
          <>
            <InspectorFieldRow label="3D 质量">
              <select
                className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-800 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90"
                value={geo3d.quality ?? "auto"}
                onChange={(e) =>
                  patchGeo3d({
                    quality: e.target.value as (typeof QUALITY_OPTIONS)[number]["value"],
                  })
                }
              >
                {QUALITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </InspectorFieldRow>
            <InspectorFieldRow label="底板厚度">
              <input
                type="range"
                min={0.2}
                max={1.5}
                step={0.05}
                value={geo3d.extrudeIntensity ?? DEFAULT_GEO3D_EXTRUDE_INTENSITY}
                onChange={(e) => patchGeo3d({ extrudeIntensity: Number(e.target.value) })}
                className="w-full"
              />
            </InspectorFieldRow>
            <InspectorSwitchRow
              label="地形贴图（离线 hillshade）"
              checked={geo3d.terrainTexture !== false}
              onCheckedChange={(terrainTexture) => patchGeo3d({ terrainTexture })}
            />
            <InspectorSwitchRow
              label="地形凹凸（法线/位移）"
              checked={geo3d.terrainRelief !== false}
              onCheckedChange={(terrainRelief) => patchGeo3d({ terrainRelief })}
            />
          </>
        ) : null}
        <p className={INSPECTOR_HINT}>
          {isMap
            ? is3d
              ? "离线中国 3D：hillshade 地形贴图 + 可选法线/位移凹凸，数据以色光叠加；无背景。单击下钻。"
              : "离线中国地图：滚轮缩放与拖拽平移；配置「地区/维度」「数据/指标」与「钻取/维度」，预览态点击地图下钻。"
            : "对标 DataEase 分类热力图：横轴、纵轴各一维度，指标决定色深；重复单元格自动求和。"}
        </p>
      </div>
    </DashboardConfigSection>
  );
}
