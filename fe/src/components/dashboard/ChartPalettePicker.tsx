import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CHART_PALETTE_CATALOG,
  CHART_PALETTE_INHERIT_LABEL,
  chartPaletteLabel,
  paletteColorsMatchPreset,
  resolveChartColors,
  resolvePaletteId,
  type ChartPalettePreset,
} from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { DE_SELECT } from "./dashboardInspectorUi";
import { INSPECTOR_SELECT } from "./inspectorCompact";
import {
  ChartPaletteColorSwatch,
  ChartPaletteSeriesColorRow,
  ChartPaletteSwatchStrip,
  PALETTE_SWATCH_STRIP_WIDTH,
} from "./chartPaletteShared";
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
  /** 继承仪表板时色带预览（与看板配置 palette 一致） */
  inheritPreviewColors?: readonly string[];
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

function PaletteMenuOption({
  row,
  inherit,
  inheritPreviewColors,
  selected = false,
}: {
  row: PaletteRow;
  inherit?: boolean;
  inheritPreviewColors?: readonly string[];
  selected?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="min-w-0 flex-1">
        <ChartPaletteSwatchStrip
          colors={row.colors}
          inherit={inherit}
          inheritPreviewColors={inheritPreviewColors}
          className="rounded-[2px]"
        />
        <span className="mt-1 block text-theme-xs leading-tight text-gray-700 dark:text-gray-300">
          {row.label}
        </span>
      </div>
      <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
        {selected ? (
          <Check
            className="size-3.5 stroke-[2.5] text-brand-500 dark:text-brand-400"
            aria-hidden
          />
        ) : null}
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
  inheritLabel = CHART_PALETTE_INHERIT_LABEL,
  inheritPreviewColors,
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
  const [menuOpen, setMenuOpen] = useState(false);
  /** 跟随看板时点「自定义」：先切到品牌预设，在父级 value 回写前本地展开面板 */
  const [bootstrapCustom, setBootstrapCustom] = useState(false);

  useEffect(() => {
    if (isCustomized) setCustomOpen(true);
  }, [isCustomized]);

  useEffect(() => {
    if (!inheritActive) setBootstrapCustom(false);
  }, [inheritActive]);

  const effectiveInheritActive = inheritActive && !bootstrapCustom;
  const effectiveResolvedId =
    bootstrapCustom && inheritActive ? "default" : resolvedId;

  const customColors = useMemo(() => {
    if (effectiveInheritActive) return [];
    const preset = resolveChartColors(effectiveResolvedId);
    if (!paletteColors?.length) return preset;
    return preset.map((color, index) => paletteColors[index] ?? color);
  }, [effectiveInheritActive, effectiveResolvedId, paletteColors]);

  const activeLabel = inheritActive
    ? inheritLabel
    : (chartPaletteLabel(resolvedId) ?? "品牌");

  const handlePresetChange = (next: string) => {
    if (next === INHERIT_VALUE) {
      onChange(undefined, []);
      onSeriesColorsChange?.([]);
      setCustomOpen(false);
      setBootstrapCustom(false);
      return;
    }
    const preset = CHART_PALETTE_CATALOG.find((item) => item.id === next);
    onChange(next, preset ? [...preset.colors] : resolveChartColors(next));
    onSeriesColorsChange?.([]);
  };

  const handleColorChange = (index: number, color: string | undefined) => {
    if (effectiveInheritActive || !color) return;
    const base = [...customColors];
    base[index] = color;
    onChange(effectiveResolvedId ?? "default", base);
  };

  const handleSeriesColorChange = (id: string, color: string) => {
    if (!seriesColors || !onSeriesColorsChange) return;
    onSeriesColorsChange(
      seriesColors.map((item) => (item.id === id ? { ...item, color } : item)),
    );
  };

  const handleReset = () => {
    if (effectiveInheritActive) return;
    if (isSeriesMode) {
      onSeriesColorsChange?.([]);
      return;
    }
    const id = effectiveResolvedId ?? "default";
    onChange(id, resolveChartColors(id));
  };

  const handleCustomToggle = () => {
    if (inheritActive) {
      handlePresetChange("default");
      setBootstrapCustom(true);
      setCustomOpen(true);
      return;
    }
    setCustomOpen((open) => !open);
  };

  const selectTriggerClass = dense
    ? cn(INSPECTOR_SELECT, "h-8 px-2")
    : cn(DE_SELECT, "h-7 px-2.5 text-[12px]");

  const settingsBtnClass = dense ? "size-8" : "size-7";

  return (
    <div className={cn("space-y-0", className)}>
      <div className="flex items-start gap-1.5">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="配色方案"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={cn(
                selectTriggerClass,
                "flex min-w-0 flex-1 items-center justify-between gap-2 text-left",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <div
                  className="shrink-0"
                  style={{ width: PALETTE_SWATCH_STRIP_WIDTH }}
                >
                  <ChartPaletteSwatchStrip
                    colors={activeColors}
                    inherit={inheritActive}
                    inheritPreviewColors={inheritPreviewColors}
                    className="rounded-[2px]"
                  />
                </div>
                <span className="min-w-0 flex-1 truncate text-theme-xs font-medium text-gray-800 dark:text-gray-200">
                  {activeLabel}
                </span>
              </div>
              <ChevronDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            collisionPadding={12}
            className="z-[100001] max-h-[min(20rem,70vh)] min-w-[var(--radix-dropdown-menu-trigger-width)] w-max max-w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-y-contain p-1"
          >
            {rows.map((row) => {
              const selected = row.id === selectValue;
              return (
                <DropdownMenuItem
                  key={row.id}
                  className={cn(
                    "cursor-pointer px-2 py-2 focus:bg-gray-100 dark:focus:bg-white/5",
                    selected && "bg-brand-50 dark:bg-brand-500/10",
                  )}
                  onSelect={() => handlePresetChange(row.id)}
                >
                  <PaletteMenuOption
                    row={row}
                    inherit={row.id === INHERIT_VALUE}
                    inheritPreviewColors={inheritPreviewColors}
                    selected={selected}
                  />
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          aria-label="自定义配色"
          aria-expanded={customOpen}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border transition-colors",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
            settingsBtnClass,
            customOpen
              ? "border-brand-500 text-brand-600 dark:border-brand-500/60 dark:text-brand-300"
              : "border-gray-300 bg-white text-gray-600 hover:border-brand-500 hover:text-brand-600 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:border-brand-500/60",
          )}
          onClick={handleCustomToggle}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
        </button>
      </div>

      {customOpen && !effectiveInheritActive ? (
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
              : customColors.map((color, index) => (
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
