import { ChartPaletteColorSwatch } from "@/components/dashboard/chartPaletteShared";
import { InspectorSliderField } from "@/components/dashboard/deAttrSlider";
import {
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  InspectorFieldLabel,
  InspectorSwitchRow,
} from "@/components/dashboard/inspectorCompact";
import type { GisProjectOverlay } from "@/components/charts/engine/maplibre/gisProject";
import type { ResolvedGisOverlayStyle } from "@/components/charts/engine/maplibre/gisProject";

type ChartGisMapLayerStyleFieldsProps = {
  resolved: ResolvedGisOverlayStyle;
  kind: "scatter" | "heatmap";
  onPatch: (patch: GisProjectOverlay) => void;
};

export function ChartGisMapLayerStyleFields({
  resolved,
  kind,
  onPatch,
}: ChartGisMapLayerStyleFieldsProps) {
  return (
    <div className={INSPECTOR_SECTION_GAP}>
      {kind === "scatter" ? (
        <div className="grid gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ChartPaletteColorSwatch
              value={resolved.color}
              aria-label="散点颜色"
              onChange={(color) => onPatch({ color })}
            />
            <InspectorFieldLabel label="散点颜色" hint="默认取图表配色首色" />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <ChartPaletteColorSwatch
              value={resolved.strokeColor}
              aria-label="描边颜色"
              onChange={(strokeColor) => onPatch({ strokeColor })}
            />
            <InspectorFieldLabel label="描边颜色" />
          </div>
        </div>
      ) : null}

      <InspectorSliderField
        label="不透明度"
        value={Math.round(resolved.opacity * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(next) => onPatch({ opacity: next / 100 })}
      />

      <InspectorSliderField
        label="最小半径"
        value={resolved.radiusMin}
        min={2}
        max={24}
        step={1}
        unit="px"
        onChange={(radiusMin) => onPatch({ radiusMin: Math.min(radiusMin, resolved.radiusMax) })}
      />

      <InspectorSliderField
        label="最大半径"
        value={resolved.radiusMax}
        min={resolved.radiusMin}
        max={32}
        step={1}
        unit="px"
        onChange={(radiusMax) => onPatch({ radiusMax })}
      />

      {kind === "scatter" ? (
        <>
          <InspectorSliderField
            label="描边宽度"
            value={resolved.strokeWidth}
            min={0}
            max={4}
            step={0.5}
            unit="px"
            onChange={(strokeWidth) => onPatch({ strokeWidth })}
          />

          <InspectorSwitchRow
            label="按指标缩放大小"
            checked={resolved.scaleByMetric}
            onCheckedChange={(scaleByMetric) => onPatch({ scaleByMetric })}
          />

          <InspectorSwitchRow
            label="按类别分色"
            checked={resolved.colorByCategory}
            onCheckedChange={(colorByCategory) => onPatch({ colorByCategory })}
          />

          <InspectorSwitchRow
            label="低 zoom 聚合"
            checked={resolved.cluster}
            onCheckedChange={(cluster) => onPatch({ cluster })}
          />

          {resolved.cluster ? (
            <InspectorSliderField
              label="聚合最大 zoom"
              hint="高于此 zoom 时显示单个散点"
              value={resolved.clusterMaxZoom}
              min={0}
              max={18}
              step={1}
              onChange={(clusterMaxZoom) => onPatch({ clusterMaxZoom })}
            />
          ) : null}

          <InspectorSwitchRow
            label="显示标签"
            checked={resolved.showLabels}
            onCheckedChange={(showLabels) => onPatch({ showLabels })}
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
                  if (Number.isFinite(next) && next >= 0) onPatch({ labelMinZoom: next });
                }}
                aria-label="标签最小 zoom"
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
