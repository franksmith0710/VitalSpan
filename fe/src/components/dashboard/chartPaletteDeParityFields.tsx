import type { ReactNode } from "react";
import { ChartPalettePicker } from "./ChartPalettePicker";
import { ChartPaletteConfigFields } from "./chartPaletteConfigFields";
import { ChartPaletteLabelTooltipFields } from "./chartPaletteLabelTooltipFields";
import { DashboardConfigSlider } from "./deAttrSlider";
import { DeAttrField, DeAttrForm, DeAttrToggleRow } from "./dashboardInspectorUi";
import { InspectorSwitchRow } from "./inspectorCompact";
import { resolvePaletteId, resolveInheritPreviewColors } from "@/lib/chartPalette";
import type { ChartLabelStyle, ChartSeriesColorItem, ChartTooltipStyle } from "@/lib/chartDeStyle";

export type ChartPaletteDeParityFieldsProps = {
  paletteId?: string;
  paletteColors?: readonly string[];
  paletteOpacity?: number;
  seriesGradient?: boolean;
  labelShow?: boolean;
  tooltipShow?: boolean;
  labelStyle?: Pick<ChartLabelStyle, "fontSize" | "color">;
  tooltipStyle?: Pick<ChartTooltipStyle, "fontSize" | "color" | "background">;
  labelColorFallback?: string;
  tooltipColorFallback?: string;
  tooltipBackgroundFallback?: string;
  seriesColor?: readonly ChartSeriesColorItem[];
  onSeriesColorsChange?: (items: readonly ChartSeriesColorItem[]) => void;
  showInherit?: boolean;
  /** 仪表板配色（组件继承预览与仪表板配置对齐） */
  dashboardPaletteId?: string;
  dashboardPaletteColors?: readonly string[];
  dense?: boolean;
  showLabelToggle?: boolean;
  showTooltipToggle?: boolean;
  showGradientToggle?: boolean;
  showOpacity?: boolean;
  labelDisabled?: boolean;
  onPaletteChange: (paletteId: string | undefined, colors: readonly string[]) => void;
  onOpacityChange?: (opacity: number) => void;
  onOpacityPreview?: (opacity: number) => void;
  onSeriesGradientChange?: (enabled: boolean) => void;
  onLabelShowChange?: (show: boolean) => void;
  onTooltipShowChange?: (show: boolean) => void;
  onLabelStyleChange?: (patch: Partial<ChartLabelStyle>) => void;
  onTooltipStyleChange?: (patch: Partial<ChartTooltipStyle>) => void;
  /** 已含「表格配色」折叠组的完整区块 */
  tableColorSection?: ReactNode;
};

/** 对标 DataEase attr-style · 图表配色表单 */
export function ChartPaletteDeParityFields({
  paletteId,
  paletteColors,
  paletteOpacity,
  seriesGradient = false,
  seriesColor,
  labelShow = false,
  tooltipShow = true,
  labelStyle = {},
  tooltipStyle = {},
  labelColorFallback,
  tooltipColorFallback,
  tooltipBackgroundFallback,
  showInherit = false,
  dashboardPaletteId,
  dashboardPaletteColors,
  dense = false,
  showLabelToggle = true,
  showTooltipToggle = true,
  showGradientToggle = true,
  showOpacity = true,
  labelDisabled = false,
  onPaletteChange,
  onOpacityChange,
  onOpacityPreview,
  onSeriesGradientChange,
  onLabelShowChange,
  onTooltipShowChange,
  onLabelStyleChange,
  onTooltipStyleChange,
  onSeriesColorsChange,
  tableColorSection,
}: ChartPaletteDeParityFieldsProps) {
  const density = dense ? "narrow" : "wide";
  const pickerValue = showInherit ? paletteId : paletteId ?? "default";
  const inheritActive = showInherit && resolvePaletteId(paletteId) == null;

  const inheritPreviewColors = resolveInheritPreviewColors(
    dashboardPaletteId,
    dashboardPaletteColors,
  );

  const gradientToggle =
    showGradientToggle && onSeriesGradientChange ? (
      density === "narrow" ? (
        <InspectorSwitchRow
          label="渐变颜色"
          checked={seriesGradient}
          onCheckedChange={onSeriesGradientChange}
        />
      ) : (
        <DeAttrToggleRow
          label="渐变颜色"
          checked={seriesGradient}
          onCheckedChange={onSeriesGradientChange}
        />
      )
    ) : null;

  const labelTooltipFields =
    onLabelStyleChange && onTooltipStyleChange ? (
      <ChartPaletteLabelTooltipFields
        density={density}
        labelShow={labelShow}
        tooltipShow={tooltipShow}
        labelStyle={labelStyle}
        tooltipStyle={tooltipStyle}
        labelColorFallback={labelColorFallback}
        tooltipColorFallback={tooltipColorFallback}
        tooltipBackgroundFallback={tooltipBackgroundFallback}
        showLabelToggle={showLabelToggle}
        showTooltipToggle={showTooltipToggle}
        labelDisabled={labelDisabled}
        onLabelShowChange={onLabelShowChange}
        onTooltipShowChange={onTooltipShowChange}
        onLabelStyleChange={onLabelStyleChange}
        onTooltipStyleChange={onTooltipStyleChange}
      />
    ) : (
      <>
        {showLabelToggle && onLabelShowChange ? (
          density === "narrow" ? (
            <InspectorSwitchRow
              label="图表标签"
              checked={labelShow}
              disabled={labelDisabled}
              onCheckedChange={onLabelShowChange}
            />
          ) : (
            <DeAttrToggleRow
              label="图表标签"
              checked={labelShow}
              disabled={labelDisabled}
              onCheckedChange={onLabelShowChange}
            />
          )
        ) : null}
        {showTooltipToggle && onTooltipShowChange ? (
          density === "narrow" ? (
            <InspectorSwitchRow
              label="图表提示"
              checked={tooltipShow}
              onCheckedChange={onTooltipShowChange}
            />
          ) : (
            <DeAttrToggleRow
              label="图表提示"
              checked={tooltipShow}
              onCheckedChange={onTooltipShowChange}
            />
          )
        ) : null}
      </>
    );

  const tableColors = tableColorSection ?? null;

  if (dense) {
    return (
      <div className="space-y-0">
        <ChartPaletteConfigFields
          paletteId={paletteId}
          paletteColors={paletteColors}
          paletteOpacity={paletteOpacity}
          seriesColors={seriesColor}
          showInherit={showInherit}
          inheritPreviewColors={inheritPreviewColors}
          dense
          onPaletteChange={onPaletteChange}
          onSeriesColorsChange={onSeriesColorsChange}
          onOpacityChange={showOpacity ? onOpacityChange : undefined}
          onOpacityPreview={showOpacity ? onOpacityPreview : undefined}
        />
        {gradientToggle}
        {labelTooltipFields}
        {tableColors}
      </div>
    );
  }

  return (
    <DeAttrForm>
      <DeAttrField label="配色方案" compact>
        <ChartPalettePicker
          showInherit={showInherit}
          value={pickerValue}
          paletteColors={paletteColors}
          seriesColors={seriesColor}
          inheritPreviewColors={inheritPreviewColors}
          onChange={onPaletteChange}
          onSeriesColorsChange={onSeriesColorsChange}
        />
      </DeAttrField>

      {gradientToggle}

      {showOpacity && onOpacityChange ? (
        <DashboardConfigSlider
          label="不透明度"
          disabled={inheritActive}
          value={paletteOpacity != null ? Math.round(paletteOpacity * 100) : undefined}
          fallback={100}
          min={0}
          max={100}
          step={1}
          unit="%"
          ariaLabel="配色不透明度"
          onChange={onOpacityChange}
          onPreviewChange={
            onOpacityPreview
              ? (value) => {
                  if (value != null) onOpacityPreview(value);
                }
              : undefined
          }
        />
      ) : null}

      {labelTooltipFields}
      {tableColors}
    </DeAttrForm>
  );
}
