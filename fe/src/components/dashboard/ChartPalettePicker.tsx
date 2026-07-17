import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CHART_PALETTE_CATALOG,
  chartPaletteLabel,
  paletteColorsMatchPreset,
  resolveChartColors,
  resolvePaletteId,
  type ChartPalettePreset,
} from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { DE_SELECT } from "./dashboardInspectorUi";
import { INSPECTOR_SELECT } from "./inspectorCompact";
import { ChartPaletteColorSwatch, ChartPaletteSeriesColorRow, ChartPaletteSwatchStrip } from "./chartPaletteShared";
import type { ChartSeriesColorItem } from "@/lib/chartDeStyle";

type ChartPalettePickerProps = {
  value?: string;
  paletteColors?: readonly string[];
  onChange: (paletteId: string | undefined, colors: readonly string[]) => void;
  /** 柱/线等系列级配色（对标 DE seriesColor）；有值时自定义区展示「色块 + 系列名」 */
  seriesColors?: readonly ChartSeriesColorItem[];
  onSeriesColorsChange?: (items: readonly ChartSeriesColorItem[]) => void;
  showInherit?: boolean;
  inheritLabel?: string;
  /** 216px 图表检查栏等窄容器 */
  dense?: boolean;
  className?: string;
};

type PaletteRow =
  | ChartPalettePreset
  | { id: "__inherit__"; label: string; colors: readonly [] };

const INHERIT_VALUE = "__inherit__";

function resolveSelectValue(value: string | undefined, showInherit: boolean): string {
  if (showInherit && !resolvePaletteId(value)) return INHERIT_VALUE;
  return resolvePaletteId(value) ?? "default";
}

function PaletteSelectOption({ row, inherit }: { row: PaletteRow; inherit?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 py-0.5">
      <ChartPaletteSwatchStrip
        colors={row.colors}
        inherit={inherit}
        className="h-4 w-[5.5rem] shrink-0 rounded-[2px]"
      />
      <span className="min-w-0 truncate text-theme-xs text-gray-700 dark:text-gray-300">
        {row.label}
      </span>
    </div>
  );
}

export function ChartPalettePicker({
  value,
  paletteColors,
  onChange,
  seriesColors,
  onSeriesColorsChange,
  showInherit = false,
  inheritLabel = "跟随看板",
  dense = false,
  className,
}: ChartPalettePickerProps) {
  const rows: PaletteRow[] = showInherit
    ? [{ id: INHERIT_VALUE, label: inheritLabel, colors: [] }, ...CHART_PALETTE_CATALOG]
    : [...CHART_PALETTE_CATALOG];

  const selectValue = resolveSelectValue(value, showInherit);
  const resolvedId = selectValue === INHERIT_VALUE ? undefined : selectValue;
  const inheritActive = showInherit && selectValue === INHERIT_VALUE;

  const activeColors = useMemo(() => {
    if (inheritActive) return [];
    const preset = resolveChartColors(resolvedId);
    if (!paletteColors?.length) return preset;
    return preset.map((color, index) => paletteColors[index] ?? color);
  }, [inheritActive, resolvedId, paletteColors]);

  const isSeriesMode = Boolean(seriesColors?.length && onSeriesColorsChange);

  const isCustomized = useMemo(() => {
    if (isSeriesMode) {
      return seriesColors!.some((item, index) => {
        const preset = resolveChartColors(resolvedId);
        const fallback = preset[index % preset.length] ?? preset[0];
        return item.color !== fallback;
      });
    }
    return !inheritActive && !paletteColorsMatchPreset(resolvedId, paletteColors);
  }, [inheritActive, isSeriesMode, paletteColors, resolvedId, seriesColors]);

  const [customOpen, setCustomOpen] = useState(isCustomized);

  useEffect(() => {
    if (isCustomized) setCustomOpen(true);
  }, [isCustomized]);

  const activeLabel = inheritActive
    ? inheritLabel
    : (chartPaletteLabel(resolvedId) ?? "品牌");

  const handlePresetChange = (next: string) => {
    if (next === INHERIT_VALUE) {
      onChange(undefined, []);
      onSeriesColorsChange?.([]);
      return;
    }
    const preset = CHART_PALETTE_CATALOG.find((item) => item.id === next);
    onChange(next, preset ? [...preset.colors] : resolveChartColors(next));
    onSeriesColorsChange?.([]);
  };

  const handleColorChange = (index: number, color: string | undefined) => {
    if (inheritActive || !color) return;
    const base = [...activeColors];
    base[index] = color;
    onChange(resolvedId ?? "default", base);
  };

  const handleSeriesColorChange = (id: string, color: string) => {
    if (!seriesColors || !onSeriesColorsChange) return;
    onSeriesColorsChange(
      seriesColors.map((item) => (item.id === id ? { ...item, color } : item)),
    );
  };

  const handleReset = () => {
    if (inheritActive) return;
    if (isSeriesMode) {
      onSeriesColorsChange?.([]);
      return;
    }
    const id = resolvedId ?? "default";
    onChange(id, resolveChartColors(id));
  };

  const selectTriggerClass = dense
    ? cn(INSPECTOR_SELECT, "h-8 px-2")
    : cn(DE_SELECT, "h-7 px-2.5 text-[12px]");

  const settingsBtnClass = dense ? "size-8" : "size-7";

  return (
    <div className={cn("space-y-0", className)}>
      <div className="flex items-start gap-1.5">
        <Select value={selectValue} onValueChange={handlePresetChange}>
          <SelectTrigger
            className={cn(selectTriggerClass, "min-w-0 flex-1 gap-2 [&>svg]:ml-auto [&>svg]:size-3.5 [&>svg]:shrink-0")}
            aria-label="配色方案"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <ChartPaletteSwatchStrip
                colors={activeColors}
                inherit={inheritActive}
                className="h-4 w-[4.5rem] shrink-0 rounded-[2px]"
              />
              <span className="min-w-0 flex-1 truncate text-left text-theme-xs font-medium text-gray-800 dark:text-gray-200">
                {activeLabel}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-[min(20rem,70vh)]">
            {rows.map((row) => (
              <SelectItem
                key={row.id}
                value={row.id}
                textValue={row.label}
                className="py-2 [&>span:first-child]:min-w-0 [&>span:first-child]:truncate-none"
              >
                <PaletteSelectOption row={row} inherit={row.id === INHERIT_VALUE} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          disabled={inheritActive}
          aria-label="自定义配色"
          aria-expanded={customOpen}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border transition-colors",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
            settingsBtnClass,
            inheritActive && "cursor-not-allowed opacity-40",
            customOpen
              ? "border-brand-500 text-brand-600 dark:border-brand-500/60 dark:text-brand-300"
              : "border-gray-300 bg-white text-gray-600 hover:border-brand-500 hover:text-brand-600 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:border-brand-500/60",
          )}
          onClick={() => setCustomOpen((open) => !open)}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
        </button>
      </div>

      {customOpen && !inheritActive ? (
        <div className="mt-2" data-testid="chart-palette-custom">
          <div className="flex items-center justify-between text-[12px] font-normal text-gray-600 dark:text-gray-300">
            <span>自定义</span>
            <button
              type="button"
              className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              onClick={handleReset}
            >
              重置
            </button>
          </div>
          <div className={cn("mt-2", isSeriesMode ? "flex flex-col gap-1" : "flex flex-wrap gap-1")}>
            {isSeriesMode
              ? seriesColors!.map((item) => (
                  <ChartPaletteSeriesColorRow
                    key={item.id}
                    name={item.name}
                    value={item.color}
                    onChange={(next) => handleSeriesColorChange(item.id, next)}
                  />
                ))
              : activeColors.map((color, index) => (
                  <ChartPaletteColorSwatch
                    key={`${index}-${color}`}
                    value={color}
                    aria-label={`系列色 ${index + 1}`}
                    onChange={(next) => handleColorChange(index, next)}
                  />
                ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
