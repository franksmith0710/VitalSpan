import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CHART_FRAME_BORDER_PRESETS,
  chartFramePresetThumbStyle,
  type ChartFramePresetId,
} from "@/lib/chartFrameBorderPresets";

type ChartFramePresetPickerProps = {
  value?: string;
  color?: string;
  onChange: (presetId: ChartFramePresetId) => void;
  className?: string;
};

export function ChartFramePresetPicker({
  value,
  color,
  onChange,
  className,
}: ChartFramePresetPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ?? "frame-1";
  const label =
    CHART_FRAME_BORDER_PRESETS.find((item) => item.id === selected)?.label ?? "边框1";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 text-left shadow-theme-xs",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
            "dark:border-gray-700 dark:bg-white/[0.03]",
            className,
          )}
          aria-label="选择装饰边框"
        >
          <span
            className="size-8 shrink-0 rounded-md"
            style={chartFramePresetThumbStyle(selected, color)}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-theme-xs text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={12}
        className="w-[min(15.5rem,calc(100vw-2rem))] p-2"
        sideOffset={6}
      >
        <div className="grid grid-cols-3 gap-1.5" role="listbox" aria-label="装饰边框">
          {CHART_FRAME_BORDER_PRESETS.map((preset) => {
            const active = preset.id === selected;
            return (
              <button
                key={preset.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={preset.label}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
                  active
                    ? "border-brand-500 bg-brand-50/60 dark:border-brand-500/60 dark:bg-brand-500/10"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
                )}
                onClick={() => {
                  onChange(preset.id);
                  setOpen(false);
                }}
              >
                <span
                  className="h-12 w-full rounded-md"
                  style={chartFramePresetThumbStyle(preset.id, color)}
                  aria-hidden
                />
                <span className="w-full truncate text-center text-[10px] text-gray-600 dark:text-gray-400">
                  {preset.label}
                </span>
                {active ? (
                  <Check className="absolute right-1 top-1 size-3 text-brand-500" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
