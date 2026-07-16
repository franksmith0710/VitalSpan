import { Check } from "lucide-react";
import {
  CHART_PALETTE_CATALOG,
  chartColors,
  resolvePaletteId,
  type ChartPalettePreset,
} from "@/lib/chartPalette";
import { cn } from "@/lib/utils";

const SWATCH_COUNT = 6;

function PaletteSwatchStrip({
  colors,
  inherit,
  className,
}: {
  colors: readonly string[];
  inherit?: boolean;
  className?: string;
}) {
  const palette = inherit ? chartColors : colors;
  return (
    <div
      className={cn(
        "flex h-3 w-full min-w-0 items-stretch gap-px overflow-hidden rounded-md",
        "ring-1 ring-inset ring-black/[0.06] dark:ring-white/10",
        className,
      )}
      aria-hidden
    >
      {palette.slice(0, SWATCH_COUNT).map((color, index) => (
        <span
          key={`${inherit ? "inherit" : color}-${index}`}
          className={cn("min-w-0 flex-1", inherit && "opacity-45")}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

type ChartPalettePickerProps = {
  value?: string;
  onChange: (paletteId: string | undefined, colors: readonly string[]) => void;
  showInherit?: boolean;
  inheritLabel?: string;
  /** 216px 图表检查栏等窄容器 */
  dense?: boolean;
  className?: string;
};

type PaletteRow =
  | ChartPalettePreset
  | { id: "__inherit__"; label: string; colors: readonly [] };

function isSelected(
  presetId: string,
  value: string | undefined,
  showInherit: boolean,
): boolean {
  if (presetId === "__inherit__") {
    return showInherit && !resolvePaletteId(value);
  }
  const resolved = resolvePaletteId(value);
  if (showInherit) {
    if (!resolved) return false;
    return resolvePaletteId(presetId) === resolved;
  }
  return resolvePaletteId(presetId) === (resolved ?? "default");
}

function paletteOptionClass(selected: boolean): string {
  return cn(
    "rounded-lg border text-left transition-colors",
    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
    selected
      ? "border-brand-500 bg-brand-50/60 shadow-theme-xs dark:border-brand-500/60 dark:bg-brand-500/10"
      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80 dark:border-gray-700 dark:bg-transparent dark:hover:border-gray-600 dark:hover:bg-white/[0.03]",
  );
}

function paletteLabelClass(selected: boolean): string {
  return cn(
    "min-w-0 truncate font-medium",
    selected ? "text-brand-600 dark:text-brand-300" : "text-gray-700 dark:text-gray-300",
  );
}

function PaletteCardGrid({
  rows,
  value,
  showInherit,
  onChange,
  compact = false,
}: {
  rows: PaletteRow[];
  value?: string;
  showInherit: boolean;
  onChange: ChartPalettePickerProps["onChange"];
  /** 216px 图表栏：单列紧凑卡片 */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5",
        compact
          ? "grid-cols-1"
          : "grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2",
      )}
      role="listbox"
      aria-label="配色方案"
    >
      {rows.map((row) => {
        const selected = isSelected(row.id, value, showInherit);
        const inherit = row.id === "__inherit__";

        return (
          <button
            key={row.id}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={row.label}
            className={cn(
              "flex min-w-0 flex-col",
              compact ? "gap-1 p-1.5" : "gap-1.5 p-2",
              inherit && "col-span-full",
              paletteOptionClass(selected),
            )}
            onClick={() => {
              if (inherit) {
                onChange(undefined, []);
                return;
              }
              onChange(row.id, row.colors);
            }}
          >
            <PaletteSwatchStrip
              colors={row.colors}
              inherit={inherit}
              className={compact ? "h-3" : "h-3.5"}
            />
            <div className="flex min-w-0 items-center justify-between gap-1">
              <span
                className={cn(
                  "min-w-0 truncate leading-snug",
                  compact ? "text-[10px]" : "text-theme-xs",
                  paletteLabelClass(selected),
                )}
              >
                {row.label}
              </span>
              {selected ? <Check className="size-3 shrink-0 text-brand-500" aria-hidden /> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ChartPalettePicker({
  value,
  onChange,
  showInherit = false,
  inheritLabel = "跟随看板",
  dense = false,
  className,
}: ChartPalettePickerProps) {
  const rows: PaletteRow[] = showInherit
    ? [
        {
          id: "__inherit__",
          label: inheritLabel,
          colors: [],
        },
        ...CHART_PALETTE_CATALOG,
      ]
    : [...CHART_PALETTE_CATALOG];

  return (
    <div className={className}>
      <PaletteCardGrid
        rows={rows}
        value={value}
        showInherit={showInherit}
        onChange={onChange}
        compact={dense}
      />
    </div>
  );
}
