import { useCallback, useMemo } from "react";
import { ChartPaletteColorSwatch } from "@/components/dashboard/chartPaletteShared";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import { InspectorSliderField } from "@/components/dashboard/deAttrSlider";
import {
  ChartInspectorSection,
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  InspectorFieldLabel,
  InspectorSwitchRow,
} from "@/components/dashboard/inspectorCompact";
import {
  DEFAULT_GIS_OVERLAY,
  readGisProject,
  resolveGisOverlayStyle,
  writeGisProject,
  type GisProjectOverlay,
} from "@/components/charts/engine/maplibre/gisProject";
import { resolveGisChartColors } from "@/lib/resolveGisChartColors";

const OVERLAY_HINT =
  "绑定数值型经度、纬度后显示散点；可选指标控制圆点大小。按省/市着色请改用「区域地图」。";

export function ChartGisMapOverlayPanel() {
  const { cfg, mutateChartConfig, dashboardStyle } = useChartInspector();
  const project = readGisProject(cfg);
  const paletteColors = useMemo(
    () => resolveGisChartColors(cfg, dashboardStyle),
    [cfg, dashboardStyle],
  );
  const resolved = useMemo(
    () => resolveGisOverlayStyle(project.overlay, paletteColors),
    [paletteColors, project.overlay],
  );

  const patchOverlay = useCallback(
    (patch: GisProjectOverlay) => {
      mutateChartConfig((current) => {
        const currentProject = readGisProject(current);
        const nextOverlay = { ...currentProject.overlay, ...patch };
        return writeGisProject(current, { overlay: nextOverlay });
      });
    },
    [mutateChartConfig],
  );

  const resetOverlay = () => {
    mutateChartConfig((current) => writeGisProject(current, { overlay: undefined }));
  };

  const hasCustomOverlay = Boolean(project.overlay && Object.keys(project.overlay).length > 0);

  return (
    <ChartInspectorSection
      title="散点叠加"
      hint={OVERLAY_HINT}
      data-testid="chart-gis-map-overlay-panel"
    >
      <div className={INSPECTOR_SECTION_GAP}>
        <div className="grid gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ChartPaletteColorSwatch
              value={resolved.color}
              aria-label="散点颜色"
              onChange={(color) => patchOverlay({ color })}
            />
            <InspectorFieldLabel label="散点颜色" hint="默认取图表配色首色" />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <ChartPaletteColorSwatch
              value={resolved.strokeColor}
              aria-label="描边颜色"
              onChange={(strokeColor) => patchOverlay({ strokeColor })}
            />
            <InspectorFieldLabel label="描边颜色" />
          </div>
        </div>

        <InspectorSliderField
          label="不透明度"
          value={Math.round(resolved.opacity * 100)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(next) => patchOverlay({ opacity: next / 100 })}
        />

        <InspectorSliderField
          label="最小半径"
          value={resolved.radiusMin}
          min={2}
          max={24}
          step={1}
          unit="px"
          onChange={(radiusMin) =>
            patchOverlay({ radiusMin: Math.min(radiusMin, resolved.radiusMax) })
          }
        />

        <InspectorSliderField
          label="最大半径"
          value={resolved.radiusMax}
          min={resolved.radiusMin}
          max={32}
          step={1}
          unit="px"
          onChange={(radiusMax) => patchOverlay({ radiusMax })}
        />

        <InspectorSliderField
          label="描边宽度"
          value={resolved.strokeWidth}
          min={0}
          max={4}
          step={0.5}
          unit="px"
          onChange={(strokeWidth) => patchOverlay({ strokeWidth })}
        />

        <InspectorSwitchRow
          label="按指标缩放大小"
          checked={resolved.scaleByMetric}
          onCheckedChange={(scaleByMetric) => patchOverlay({ scaleByMetric })}
        />

        <InspectorSwitchRow
          label="按类别分色"
          checked={resolved.colorByCategory}
          onCheckedChange={(colorByCategory) => patchOverlay({ colorByCategory })}
        />

        <InspectorSwitchRow
          label="低 zoom 聚合"
          checked={resolved.cluster}
          onCheckedChange={(cluster) => patchOverlay({ cluster })}
        />

        {resolved.cluster ? (
          <InspectorSliderField
            label="聚合最大 zoom"
            hint="高于此 zoom 时显示单个散点"
            value={resolved.clusterMaxZoom}
            min={0}
            max={18}
            step={1}
            onChange={(clusterMaxZoom) => patchOverlay({ clusterMaxZoom })}
          />
        ) : null}

        <InspectorSwitchRow
          label="有散点时自动定位"
          checked={resolved.autoFit}
          onCheckedChange={(autoFit) => patchOverlay({ autoFit })}
        />

        <InspectorSwitchRow
          label="显示标签"
          checked={resolved.showLabels}
          onCheckedChange={(showLabels) => patchOverlay({ showLabels })}
        />

        {resolved.showLabels ? (
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="标签最小 zoom" hint="缩放级别低于此值时隐藏标签" />
            <input
              type="number"
              className={INSPECTOR_CTRL}
              min={0}
              max={18}
              step={0.5}
              value={resolved.labelMinZoom}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next) && next >= 0) patchOverlay({ labelMinZoom: next });
              }}
              aria-label="标签最小 zoom"
            />
          </div>
        ) : null}

        {hasCustomOverlay ? (
          <button
            type="button"
            className="text-theme-xs text-brand-500 hover:underline"
            onClick={resetOverlay}
          >
            恢复默认（半径 {DEFAULT_GIS_OVERLAY.radiusMin}–{DEFAULT_GIS_OVERLAY.radiusMax}px）
          </button>
        ) : null}
      </div>
    </ChartInspectorSection>
  );
}
