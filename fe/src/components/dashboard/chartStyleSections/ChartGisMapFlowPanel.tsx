import { useCallback, useMemo } from "react";
import { ChartPaletteColorSwatch } from "@/components/dashboard/chartPaletteShared";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import { InspectorSliderField } from "@/components/dashboard/deAttrSlider";
import {
  ChartInspectorSection,
  INSPECTOR_SECTION_GAP,
  InspectorFieldLabel,
  InspectorSwitchRow,
} from "@/components/dashboard/inspectorCompact";
import {
  DEFAULT_GIS_FLOW,
  readGisProject,
  resolveGisFlowStyle,
  writeGisProject,
  type GisProjectFlow,
} from "@/components/charts/engine/maplibre/gisProject";
import { resolveGisChartColors } from "@/lib/resolveGisChartColors";

const FLOW_HINT =
  "开启后数据槽为：起点经/纬、终点经/纬（drill 槽）、可选流量指标。与散点互斥；示例见数据 Tab 一键接入。";

export function ChartGisMapFlowPanel() {
  const { cfg, mutateChartConfig, dashboardStyle } = useChartInspector();
  const project = readGisProject(cfg);
  const paletteColors = useMemo(
    () => resolveGisChartColors(cfg, dashboardStyle),
    [cfg, dashboardStyle],
  );
  const resolved = useMemo(
    () => resolveGisFlowStyle(project.flow, paletteColors),
    [paletteColors, project.flow],
  );

  const patchFlow = useCallback(
    (patch: GisProjectFlow) => {
      mutateChartConfig((current) => {
        const currentProject = readGisProject(current);
        const nextFlow = { ...currentProject.flow, ...patch };
        return writeGisProject(current, { flow: nextFlow });
      });
    },
    [mutateChartConfig],
  );

  const resetFlow = () => {
    mutateChartConfig((current) => writeGisProject(current, { flow: undefined }));
  };

  const hasCustomFlow = Boolean(project.flow && Object.keys(project.flow).length > 0);

  return (
    <ChartInspectorSection
      title="OD 飞线"
      hint={FLOW_HINT}
      data-testid="chart-gis-map-flow-panel"
    >
      <div className={INSPECTOR_SECTION_GAP}>
        <InspectorSwitchRow
          label="启用 OD 飞线"
          checked={resolved.enabled}
          onCheckedChange={(enabled) => patchFlow({ enabled })}
        />

        {resolved.enabled ? (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <ChartPaletteColorSwatch
                value={resolved.color}
                aria-label="飞线颜色"
                onChange={(color) => patchFlow({ color })}
              />
              <InspectorFieldLabel label="飞线颜色" hint="默认取图表配色首色" />
            </div>

            <InspectorSliderField
              label="不透明度"
              value={Math.round(resolved.opacity * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(next) => patchFlow({ opacity: next / 100 })}
            />

            <InspectorSliderField
              label="最小线宽"
              value={resolved.widthMin}
              min={0.5}
              max={8}
              step={0.5}
              unit="px"
              onChange={(widthMin) =>
                patchFlow({ widthMin: Math.min(widthMin, resolved.widthMax) })
              }
            />

            <InspectorSliderField
              label="最大线宽"
              value={resolved.widthMax}
              min={resolved.widthMin}
              max={12}
              step={0.5}
              unit="px"
              onChange={(widthMax) => patchFlow({ widthMax })}
            />

            <InspectorSwitchRow
              label="按流量缩放线宽"
              checked={resolved.scaleByMetric}
              onCheckedChange={(scaleByMetric) => patchFlow({ scaleByMetric })}
            />

            <InspectorSwitchRow
              label="有飞线时自动定位"
              checked={resolved.autoFit}
              onCheckedChange={(autoFit) => patchFlow({ autoFit })}
            />

            <InspectorSwitchRow
              label="流动动画"
              checked={resolved.animate}
              onCheckedChange={(animate) => patchFlow({ animate })}
            />

            {hasCustomFlow ? (
              <button
                type="button"
                className="text-theme-xs text-brand-500 hover:underline"
                onClick={resetFlow}
              >
                恢复默认（线宽 {DEFAULT_GIS_FLOW.widthMin}–{DEFAULT_GIS_FLOW.widthMax}px）
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </ChartInspectorSection>
  );
}
