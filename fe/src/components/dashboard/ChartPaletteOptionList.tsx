import { Check } from "lucide-react";
import {
  ChartPaletteSwatchStrip,
  PALETTE_SWATCH_STRIP_WIDTH,
  type ChartPaletteSwatchStripProps,
} from "./chartPaletteShared";
import { cn } from "@/lib/utils";
import type { ChartPalettePreset } from "@/lib/chartPalette";

export type PaletteRow =
  | ChartPalettePreset
  | { id: string; label: string; colors: readonly [] };

export function PaletteMenuOption({
  row,
  inherit,
  inheritPreviewColors,
  selected = false,
}: {
  row: PaletteRow;
  inherit?: boolean;
  inheritPreviewColors?: ChartPaletteSwatchStripProps["inheritPreviewColors"];
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

type ChartPaletteInlineMenuProps = {
  rows: readonly PaletteRow[];
  selectedId: string;
  inheritValue: string;
  inheritPreviewColors?: ChartPaletteSwatchStripProps["inheritPreviewColors"];
  onSelect: (id: string) => void;
};

/** 内联配色列表：不走 Portal，专供 216px 图表栏 */
export function ChartPaletteInlineMenu({
  rows,
  selectedId,
  inheritValue,
  inheritPreviewColors,
  onSelect,
}: ChartPaletteInlineMenuProps) {
  return (
    <div
      role="listbox"
      aria-label="配色方案"
      data-testid="chart-palette-inline-menu"
      className="flex flex-col gap-0.5"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {rows.map((row) => {
        const selected = row.id === selectedId;
        return (
          <button
            key={row.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(
              "flex w-full cursor-pointer rounded-lg px-2 py-2 text-left transition-colors touch-manipulation",
              "hover:bg-gray-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
              "dark:hover:bg-white/5",
              selected && "bg-brand-50 dark:bg-brand-500/10",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(row.id);
            }}
          >
            <PaletteMenuOption
              row={row}
              inherit={row.id === inheritValue}
              inheritPreviewColors={inheritPreviewColors}
              selected={selected}
            />
          </button>
        );
      })}
    </div>
  );
}

type ChartPaletteCurrentDisplayProps = {
  activeLabel: string;
  activeColors: readonly string[];
  inheritActive: boolean;
  inheritPreviewColors?: ChartPaletteSwatchStripProps["inheritPreviewColors"];
  triggerClass: string;
};

/** 当前选中展示（窄栏内不参与展开，列表常显） */
export function ChartPaletteCurrentDisplay({
  activeLabel,
  activeColors,
  inheritActive,
  inheritPreviewColors,
  triggerClass,
}: ChartPaletteCurrentDisplayProps) {
  return (
    <div
      aria-label="当前配色方案"
      className={cn(
        triggerClass,
        "pointer-events-none flex min-w-0 flex-1 items-center justify-between gap-2 text-left",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="shrink-0" style={{ width: PALETTE_SWATCH_STRIP_WIDTH }}>
          <ChartPaletteSwatchStrip
            colors={activeColors}
            inherit={inheritActive}
            inheritPreviewColors={inheritPreviewColors}
            className="rounded-[2px]"
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-theme-xs font-medium text-gray-800 dark:text-gray-200">
          {activeLabel}
        </span>
      </span>
    </div>
  );
}
