import type { ReactNode } from "react";
import { ChartPalettePicker } from "./ChartPalettePicker";
import { ChartDeSliderField } from "./deAttrSlider";
import { DeAttrField, DeAttrForm, DeAttrToggleRow } from "./dashboardInspectorUi";
import { resolvePaletteId } from "@/lib/chartPalette";

export type ChartPaletteDeParityFieldsProps = {
  paletteId?: string;
  paletteOpacity?: number;
  seriesGradient?: boolean;
  labelShow?: boolean;
  tooltipShow?: boolean;
  showInherit?: boolean;
  dense?: boolean;
  showLabelToggle?: boolean;
  showTooltipToggle?: boolean;
  showGradientToggle?: boolean;
  showOpacity?: boolean;
  onPaletteChange: (paletteId: string | undefined, colors: readonly string[]) => void;
  onOpacityChange?: (opacity: number) => void;
  onOpacityPreview?: (opacity: number) => void;
  onSeriesGradientChange?: (enabled: boolean) => void;
  onLabelShowChange?: (show: boolean) => void;
  onTooltipShowChange?: (show: boolean) => void;
  tableColorSlot?: ReactNode;
};

/** 对标 DataEase attr-style · 图表配色表单 */
export function ChartPaletteDeParityFields({
  paletteId,
  paletteOpacity,
  seriesGradient = false,
  labelShow = false,
  tooltipShow = true,
  showInherit = false,
  dense = false,
  showLabelToggle = true,
  showTooltipToggle = true,
  showGradientToggle = true,
  showOpacity = true,
  onPaletteChange,
  onOpacityChange,
  onOpacityPreview,
  onSeriesGradientChange,
  onLabelShowChange,
  onTooltipShowChange,
  tableColorSlot,
}: ChartPaletteDeParityFieldsProps) {
  const pickerValue = showInherit ? paletteId : paletteId ?? "default";
  const inheritActive = showInherit && resolvePaletteId(paletteId) == null;

  return (
    <DeAttrForm>
      <DeAttrField label="配色方案" compact={dense}>
        <ChartPalettePicker
          showInherit={showInherit}
          dense={dense}
          value={pickerValue}
          onChange={onPaletteChange}
        />
      </DeAttrField>

      {showOpacity && onOpacityChange ? (
        <DeAttrField label="不透明度" compact={dense}>
          <ChartDeSliderField
            label=""
            layout={dense ? "inline" : "stacked"}
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
        </DeAttrField>
      ) : null}

      {showGradientToggle && onSeriesGradientChange ? (
        <DeAttrToggleRow
          label="渐变颜色"
          checked={seriesGradient}
          onCheckedChange={onSeriesGradientChange}
        />
      ) : null}

      {showLabelToggle && onLabelShowChange ? (
        <DeAttrToggleRow
          label="图表标签"
          checked={labelShow}
          onCheckedChange={onLabelShowChange}
        />
      ) : null}

      {showTooltipToggle && onTooltipShowChange ? (
        <DeAttrToggleRow
          label="图表提示"
          checked={tooltipShow}
          onCheckedChange={onTooltipShowChange}
        />
      ) : null}

      {tableColorSlot ? (
        <DeAttrField label="表格配色" compact={dense}>
          {tableColorSlot}
        </DeAttrField>
      ) : null}
    </DeAttrForm>
  );
}
