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
        "flex h-1.5 w-full min-w-0 items-stretch gap-px overflow-hidden rounded-[2px]",
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
  dense = false,
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
        "grid gap-1.5",
        dense
          ? "grid-cols-2"
          : "grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))]",
        className,
      )}
      role="listbox"
      aria-label="配色方案"
    >
      {rows.map((row) => {
        const selected = isSelected(row.id, value, showInherit);
        const inherit = row.id === "__inherit__";
        const optionLabel =
          inherit ? `${row.label}，${row.hint}` : row.label;

        return (
          <button
            key={row.id}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={optionLabel}
            title={row.hint}
            className={cn(
              "flex min-w-0 flex-col gap-1 rounded-lg border text-left transition-colors",
              dense ? "gap-0.5 p-1" : "gap-1 p-1.5",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
              inherit && "col-span-full",
              selected
                ? "border-brand-500 bg-brand-50/60 shadow-theme-xs dark:border-brand-500/60 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80 dark:border-gray-700 dark:bg-transparent dark:hover:border-gray-600 dark:hover:bg-white/[0.03]",
            )}
            onClick={() => {
              if (inherit) {
                onChange(undefined, []);
                return;
              }
              onChange(row.id, row.colors);
            }}
          >
            <PaletteSwatchStrip colors={row.colors} inherit={inherit} />
            <div className="flex min-w-0 items-center justify-between gap-0.5">
              <span
                className={cn(
                  "min-w-0 truncate text-[10px] font-medium leading-tight",
                  selected
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-gray-700 dark:text-gray-300",
                )}
              >
                {row.label}
              </span>
              {selected ? (
                <Check className="size-2.5 shrink-0 text-brand-500" aria-hidden />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
