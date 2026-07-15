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
        "flex h-2 w-full min-w-0 items-stretch gap-px overflow-hidden rounded-[3px]",
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
  className?: string;
};

type PaletteRow =
  | ChartPalettePreset
  | { id: "__inherit__"; label: string; hint: string; colors: readonly [] };

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

export function ChartPalettePicker({
  value,
  onChange,
  showInherit = false,
  inheritLabel = "跟随看板",
  className,
}: ChartPalettePickerProps) {
  const rows: PaletteRow[] = showInherit
    ? [
        {
          id: "__inherit__",
          label: inheritLabel,
          hint: "继承仪表板全局配色",
          colors: [],
        },
        ...CHART_PALETTE_CATALOG,
      ]
    : [...CHART_PALETTE_CATALOG];

  return (
    <div
      className={cn(
        "divide-y divide-gray-100 dark:divide-white/[0.06]",
        className,
      )}
      role="listbox"
      aria-label="配色方案"
    >
      {rows.map((row) => {
        const selected = isSelected(row.id, value, showInherit);
        const optionLabel =
          row.id === "__inherit__" ? `${row.label}，${row.hint}` : row.label;
        return (
          <button
            key={row.id}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={optionLabel}
            title={row.hint}
            className={cn(
              "w-full px-0 py-1.5 text-left transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30",
              selected
                ? "bg-brand-50/40 dark:bg-brand-500/[0.06]"
                : "hover:bg-gray-50/80 dark:hover:bg-white/[0.03]",
            )}
            onClick={() => {
              if (row.id === "__inherit__") {
                onChange(undefined, []);
                return;
              }
              onChange(row.id, row.colors);
            }}
          >
            <div className="mb-1 flex min-w-0 items-center justify-between gap-1">
              <span
                className={cn(
                  "min-w-0 truncate text-theme-xs font-medium",
                  selected
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-gray-700 dark:text-gray-300",
                )}
              >
                {row.label}
              </span>
              {selected ? (
                <Check className="size-3 shrink-0 text-brand-500" aria-hidden />
              ) : null}
            </div>
            <PaletteSwatchStrip
              colors={row.colors}
              inherit={row.id === "__inherit__"}
            />
          </button>
        );
      })}
    </div>
  );
}
