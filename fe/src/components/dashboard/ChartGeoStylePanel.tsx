import {
  hasCustomGeoRegionBorderColor,
  resolveGeoRegionBorderColorHex,
  resolveGeoRegionBorderFlow,
  resolveGeoRegionBorderFlowColorHex,
  resolveGeoRegionBorderShow,
} from "@/components/charts/engine/geo/geoRegionBorderStyle";
import { GEO_BORDER_FLOW_DEFAULTS } from "@/components/charts/engine/three/geoBorderFlowMaterial";
import {
  DEFAULT_SCENE_CLOUD_DENSITY,
  DEFAULT_SCENE_CLOUD_HEIGHT,
  DEFAULT_SCENE_CLOUD_SPEED,
} from "@/components/charts/engine/three/geo3dSceneCloudStyle";
import {
  GEO3D_STYLE_PRESETS,
  geo3dPresetDefaults,
  hasCustomGeo3dShellColor,
  resolveGeo3dSceneClouds,
  resolveGeo3dShellColorHex,
  resolveGeo3dStylePreset,
  type Geo3dStylePreset,
} from "@/components/charts/engine/three/geo3dVisualStyle";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  DEFAULT_GEO3D_EXTRUDE_INTENSITY,
  DEFAULT_GEO3D_SHELL_OPACITY,
  patchChartDeStyleNested,
  readChartGeoStyle,
  readChartGeo3dStyle,
  type ChartDeStyle,
} from "@/lib/chartDeStyle";
import { DeAttrSliderField } from "./deAttrSlider";
import {
  ChartInspectorSection,
  INSPECTOR_HINT,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT_TRIGGER,
  InspectorFieldRow,
  InspectorInlineColorRow,
  InspectorSwitchRow,
} from "./inspectorCompact";
import { WIDGET_BORDER_RECOMMENDED } from "./dashboardStyleConfig";
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
  const borderFlow = resolveGeoRegionBorderFlow(geo);
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
              <InspectorInlineColorRow
                label="边界颜色"
                value={resolveGeoRegionBorderColorHex(geo, isDarkTheme, borderColorPreset)}
                fallbackValue={resolveGeoRegionBorderColorHex(
                  { ...geo, regionBorderColor: undefined },
                  isDarkTheme,
                  borderColorPreset,
                )}
                allowClear={hasCustomGeoRegionBorderColor(geo)}
                swatches={WIDGET_BORDER_RECOMMENDED}
                onChange={(next) => patchGeo({ regionBorderColor: next })}
              />
            ) : null}
            {is3d && showRegionBorder ? (
              <>
                <InspectorSwitchRow
                  label="边界流光"
                  checked={borderFlow.enabled}
                  onCheckedChange={(regionBorderFlow) => patchGeo({ regionBorderFlow })}
                />
                {borderFlow.enabled ? (
                  <>
                    <InspectorInlineColorRow
                      label="流光颜色"
                      value={resolveGeoRegionBorderFlowColorHex(geo)}
                      fallbackValue={borderFlow.colorCss}
                      allowClear={false}
                      swatches={WIDGET_BORDER_RECOMMENDED}
                      onChange={(next) => patchGeo({ regionBorderFlowColor: next ?? borderFlow.colorCss })}
                    />
                    <DeAttrSliderField
                      label="流光速度"
                      compact
                      value={borderFlow.speed}
                      fallback={GEO_BORDER_FLOW_DEFAULTS.speed}
                      min={1}
                      max={20}
                      step={0.5}
                      ariaLabel="流光速度"
                      onChange={(regionBorderFlowSpeed) => patchGeo({ regionBorderFlowSpeed })}
                    />
                    <DeAttrSliderField
                      label="拖影长度"
                      compact
                      value={borderFlow.trailLength}
                      fallback={GEO_BORDER_FLOW_DEFAULTS.trailLength}
                      min={GEO_BORDER_FLOW_DEFAULTS.trailMin}
                      max={GEO_BORDER_FLOW_DEFAULTS.trailMax}
                      step={1}
                      ariaLabel="拖影长度"
                      onChange={(regionBorderFlowTrailLength) => patchGeo({ regionBorderFlowTrailLength })}
                    />
                    <p className={INSPECTOR_HINT}>
                      流光仅沿当前层级外轮廓流动（全国仅国界线，下钻后仅该省/市外缘）。
                    </p>
                  </>
                ) : null}
              </>
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
            <DeAttrSliderField
              label="底板厚度"
              compact
              value={geo3d.extrudeIntensity}
              fallback={DEFAULT_GEO3D_EXTRUDE_INTENSITY}
              min={0.2}
              max={1.5}
              step={0.05}
              ariaLabel="底板厚度"
              onChange={(extrudeIntensity) => patchGeo3d({ extrudeIntensity })}
            />
            <InspectorInlineColorRow
              label="底板颜色"
              value={resolveGeo3dShellColorHex(geo3d, isDarkTheme)}
              fallbackValue={resolveGeo3dShellColorHex(
                { ...geo3d, shellColor: undefined },
                isDarkTheme,
              )}
              allowClear={hasCustomGeo3dShellColor(geo3d)}
              swatches={WIDGET_BORDER_RECOMMENDED}
              onChange={(next) => patchGeo3d({ shellColor: next })}
            />
            <DeAttrSliderField
              label="底板不透明度"
              compact
              value={geo3d.shellOpacity}
              fallback={DEFAULT_GEO3D_SHELL_OPACITY}
              min={0}
              max={1}
              step={0.05}
              ariaLabel="底板不透明度"
              onChange={(shellOpacity) => patchGeo3d({ shellOpacity })}
            />
            <InspectorSwitchRow
              label="场景云"
              checked={resolveGeo3dSceneClouds(geo3d)}
              onCheckedChange={(sceneFog) => patchGeo3d({ sceneFog })}
            />
            {resolveGeo3dSceneClouds(geo3d) ? (
              <>
                <DeAttrSliderField
                  label="云团密度"
                  compact
                  value={geo3d.sceneCloudDensity}
                  fallback={DEFAULT_SCENE_CLOUD_DENSITY}
                  min={0.1}
                  max={1}
                  step={0.05}
                  ariaLabel="场景云密度"
                  onChange={(sceneCloudDensity) => patchGeo3d({ sceneCloudDensity })}
                />
                <DeAttrSliderField
                  label="漂移速度"
                  compact
                  value={geo3d.sceneCloudSpeed}
                  fallback={DEFAULT_SCENE_CLOUD_SPEED}
                  min={0}
                  max={2}
                  step={0.05}
                  ariaLabel="场景云漂移速度"
                  onChange={(sceneCloudSpeed) => patchGeo3d({ sceneCloudSpeed })}
                />
                <DeAttrSliderField
                  label="云高度"
                  compact
                  value={geo3d.sceneCloudHeight}
                  fallback={DEFAULT_SCENE_CLOUD_HEIGHT}
                  min={0.2}
                  max={2}
                  step={0.05}
                  ariaLabel="场景云高度"
                  onChange={(sceneCloudHeight) => patchGeo3d({ sceneCloudHeight })}
                />
              </>
            ) : null}
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
