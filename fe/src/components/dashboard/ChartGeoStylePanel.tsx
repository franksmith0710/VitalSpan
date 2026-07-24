import {
  GEO3D_TERRAIN_RELIEF_SHIPPED,
  resolveTerrainReliefEnabled,
} from "@/components/charts/engine/three/geo3dRuntime";
import {
  hasCustomGeoRegionBorderColor,
  resolveGeoRegionBorderColorHex,
  resolveGeoRegionBorderShow,
} from "@/components/charts/engine/geo/geoRegionBorderStyle";
import {
  GEO3D_STYLE_PRESETS,
  geo3dPresetDefaults,
  hasCustomGeo3dShellColor,
  resolveGeo3dSceneFog,
  resolveGeo3dShellColorHex,
  resolveGeo3dStylePreset,
  type Geo3dStylePreset,
} from "@/components/charts/engine/three/geo3dVisualStyle";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  DEFAULT_GEO3D_EXTRUDE_INTENSITY,
  patchChartDeStyleNested,
  readChartGeoStyle,
  readChartGeo3dStyle,
  type ChartDeStyle,
} from "@/lib/chartDeStyle";
import {
  ChartInspectorSection,
  INSPECTOR_HINT,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT_TRIGGER,
  InspectorFieldRow,
  InspectorSwitchRow,
} from "./inspectorCompact";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { dashboardStyle } = useChartInspector();
  const isDarkTheme = dashboardStyle?.colorScheme === "dark";
  const geo = readChartGeoStyle(deStyle);
  const geo3d = readChartGeo3dStyle(deStyle);
  const patchGeo = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "geo", patch));
  const patchGeo3d = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "geo3d", patch));
  const isMap = chartType === "map" || chartType === "map-3d";
  const is3d = chartType === "map-3d";
  const showRegionBorder = resolveGeoRegionBorderShow(geo);
  const borderColorPreset = is3d ? resolveGeo3dStylePreset(geo3d) : undefined;

  return (
    <ChartInspectorSection title={isMap ? "地图样式" : "热力图样式"} data-testid="chart-geo-style">
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
        {isMap ? (
          <>
            <InspectorSwitchRow
              label="行政区边界"
              checked={showRegionBorder}
              onCheckedChange={(next) => patchGeo({ showRegionBorder: next })}
            />
            {showRegionBorder ? (
              <InspectorFieldRow label="边界颜色">
                <div className="flex w-full items-center gap-2">
                  <input
                    type="color"
                    className="h-8 min-w-0 flex-1 cursor-pointer rounded border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900"
                    value={resolveGeoRegionBorderColorHex(geo, isDarkTheme, borderColorPreset)}
                    onChange={(e) => patchGeo({ regionBorderColor: e.target.value })}
                    aria-label="行政区边界颜色"
                  />
                  {hasCustomGeoRegionBorderColor(geo) ? (
                    <button
                      type="button"
                      className="shrink-0 text-theme-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => patchGeo({ regionBorderColor: undefined })}
                    >
                      恢复
                    </button>
                  ) : null}
                </div>
              </InspectorFieldRow>
            ) : null}
            <p className={INSPECTOR_HINT}>
              边界随下钻层级切换：全国显示省界，省级显示市界，市级显示区县界。
            </p>
          </>
        ) : null}
        {is3d ? (
          <>
            <InspectorFieldRow label="3D 样式">
              <Select
                value={resolveGeo3dStylePreset(geo3d)}
                onValueChange={(preset) =>
                  patchGeo3d(geo3dPresetDefaults(preset as Geo3dStylePreset))
                }
              >
                <SelectTrigger className={INSPECTOR_SELECT_TRIGGER} aria-label="3D 样式">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEO3D_STYLE_PRESETS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InspectorFieldRow>
            <p className={INSPECTOR_HINT}>
              {GEO3D_STYLE_PRESETS.find((p) => p.value === resolveGeo3dStylePreset(geo3d))?.hint}
            </p>
            <InspectorFieldRow label="3D 质量">
              <Select
                value={geo3d.quality ?? "auto"}
                onValueChange={(quality) =>
                  patchGeo3d({
                    quality: quality as (typeof QUALITY_OPTIONS)[number]["value"],
                  })
                }
              >
                <SelectTrigger className={INSPECTOR_SELECT_TRIGGER} aria-label="3D 质量">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <InspectorFieldRow label="底板颜色">
              <div className="flex w-full items-center gap-2">
                <input
                  type="color"
                  className="h-8 min-w-0 flex-1 cursor-pointer rounded border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900"
                  value={resolveGeo3dShellColorHex(geo3d, isDarkTheme)}
                  onChange={(e) => patchGeo3d({ shellColor: e.target.value })}
                  aria-label="底板颜色"
                />
                {hasCustomGeo3dShellColor(geo3d) ? (
                  <button
                    type="button"
                    className="shrink-0 text-theme-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => patchGeo3d({ shellColor: undefined })}
                  >
                    恢复
                  </button>
                ) : null}
              </div>
            </InspectorFieldRow>
            <InspectorSwitchRow
              label="地形贴图（离线卫星）"
              checked={geo3d.terrainTexture !== false}
              onCheckedChange={(terrainTexture) => patchGeo3d({ terrainTexture })}
            />
            <InspectorSwitchRow
              label="场景雾"
              checked={resolveGeo3dSceneFog(geo3d)}
              onCheckedChange={(sceneFog) => patchGeo3d({ sceneFog })}
            />
            <InspectorSwitchRow
              label="地形凹凸（未开放）"
              checked={resolveTerrainReliefEnabled(geo3d)}
              disabled={!GEO3D_TERRAIN_RELIEF_SHIPPED}
              onCheckedChange={(terrainRelief) => patchGeo3d({ terrainRelief })}
            />
          </>
        ) : null}
        <p className={INSPECTOR_HINT}>
          {isMap
            ? is3d
              ? "离线中国 3D：可选卫星/科技/经典/简洁样式；双击下钻。"
              : "离线中国地图：滚轮缩放与拖拽平移；配置「地区/维度」「数据/指标」与「钻取/维度」，预览态双击地图下钻。"
            : "对标 DataEase 分类热力图：横轴、纵轴各一维度，指标决定色深；重复单元格自动求和。"}
        </p>
      </div>
    </ChartInspectorSection>
  );
}
