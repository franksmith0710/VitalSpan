import { ChartPalettePicker } from "./ChartPalettePicker";
import { ChartDeSliderField } from "./deAttrSlider";
import { resolvePaletteId } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";

type ChartPaletteConfigFieldsProps = {
  paletteId?: string;
  paletteOpacity?: number;
  onPaletteChange: (paletteId: string | undefined, colors: readonly string[]) => void;
  onOpacityChange?: (opacity: number) => void;
  /** 组件级：可选跟随看板 */
  showInherit?: boolean;
  /** 216px 图表栏等窄容器 */
  dense?: boolean;
  className?: string;
};

/** 看板 / 组件共用的配色方案区块（选择器 + 可选不透明度） */
export function ChartPaletteConfigFields({
  paletteId,
  paletteOpacity,
  onPaletteChange,
  onOpacityChange,
  showInherit = false,
  dense = false,
  className,
}: ChartPaletteConfigFieldsProps) {
  const pickerValue = showInherit ? paletteId : paletteId ?? "default";
  const inheritActive = showInherit && resolvePaletteId(paletteId) == null;

  return (
    <div className={cn("space-y-2.5", className)}>
      <ChartPalettePicker
        showInherit={showInherit}
        dense={dense}
        value={pickerValue}
        onChange={onPaletteChange}
      />
      {onOpacityChange ? (
        <div className="space-y-1">
          <ChartDeSliderField
            label={dense ? "不透明度" : "配色不透明度"}
            layout={dense ? "inline" : "stacked"}
            disabled={inheritActive}
            value={
              paletteOpacity != null ? Math.round(paletteOpacity * 100) : undefined
            }
            fallback={100}
            min={0}
            max={100}
            step={1}
            unit="%"
            ariaLabel="配色不透明度"
            onChange={onOpacityChange}
          />
          {inheritActive ? (
            <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">
              跟随看板配色时，请先在上方选择独立配色方案
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
