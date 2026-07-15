import { useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPickerPanel } from "@/components/ui/color-picker-panel";
import { normalizeHexColor } from "@/components/ui/color-utils";

export { normalizeHexColor } from "@/components/ui/color-utils";

export type ColorSwatch = {
  color: string;
  label: string;
};

type ColorFieldProps = {
  value: string;
  onChange: (value: string | undefined) => void;
  swatches?: readonly ColorSwatch[] | readonly string[];
  label?: string;
  allowClear?: boolean;
  compact?: boolean;
  className?: string;
  /** 取色器/输入框连续变更时防抖提交，减轻画布等大组件重渲染 */
  liveCommitMs?: number;
  /** 有推荐色板时默认展开 */
  swatchesDefaultOpen?: boolean;
};

const DEFAULT_LIVE_COMMIT_MS = 120;

function normalizeSwatches(
  swatches: readonly ColorSwatch[] | readonly string[],
): ColorSwatch[] {
  if (swatches.length === 0) return [];
  if (typeof swatches[0] === "string") {
    return (swatches as readonly string[]).map((color) => ({ color, label: color }));
  }
  return swatches as ColorSwatch[];
}

function resolveCommitValue(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return normalizeHexColor(trimmed) ?? trimmed;
}

export function ColorField({
  value,
  onChange,
  swatches = [],
  label,
  allowClear = true,
  compact = false,
  className,
  liveCommitMs = DEFAULT_LIVE_COMMIT_MS,
  swatchesDefaultOpen: _swatchesDefaultOpen = false,
}: ColorFieldProps) {
  const items = normalizeSwatches(swatches);
  const [localValue, setLocalValue] = useState(value);
  const [open, setOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | undefined>(undefined);

  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const flushCommit = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current === undefined) return;
    const next = pendingRef.current;
    pendingRef.current = undefined;
    onChangeRef.current(next);
  };

  const commitNow = (raw: string) => {
    pendingRef.current = resolveCommitValue(raw);
    flushCommit();
  };

  const scheduleCommit = (raw: string) => {
    pendingRef.current = resolveCommitValue(raw);
    if (liveCommitMs <= 0) {
      flushCommit();
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushCommit, liveCommitMs);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && pendingRef.current !== undefined) flushCommit();
  };

  const applyColor = (next: string) => {
    setLocalValue(next);
    scheduleCommit(next);
  };

  const displayHex = normalizeHexColor(localValue) ?? localValue;
  const pickerLabel = label ? `${label}取色器` : "取色器";

  return (
    <div className={cn(compact ? "space-y-1.5" : "space-y-2", className)}>
      {label ? (
        <Label className="text-theme-xs text-gray-600 dark:text-gray-400">{label}</Label>
      ) : null}
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={pickerLabel}
              title="点击打开取色器"
              className={cn(
                "group/picker relative shrink-0 overflow-hidden rounded-md border border-gray-200 shadow-theme-xs transition-shadow hover:ring-2 hover:ring-brand-500/30 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/30 dark:border-gray-700",
                compact ? "size-8" : "size-9",
              )}
            >
              <span
                className="absolute inset-0"
                style={{ background: displayHex || "#ffffff" }}
                aria-hidden
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/picker:bg-black/10">
                <Pipette
                  className={cn(
                    "text-white drop-shadow-sm opacity-70 transition-opacity group-hover/picker:opacity-100",
                    compact ? "size-3.5" : "size-4",
                  )}
                  aria-hidden
                />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-[260px] p-3">
            <ColorPickerPanel value={localValue} onChange={applyColor} />
            {items.length > 0 ? (
              <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                <p className="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">推荐颜色</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      title={item.label}
                      aria-label={item.label}
                      className={cn(
                        "size-6 rounded-md border transition-transform hover:scale-105",
                        normalizeHexColor(localValue) === normalizeHexColor(item.color)
                          ? "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-gray-dark"
                          : "border-gray-200 dark:border-gray-700",
                      )}
                      style={{ background: item.color }}
                      onClick={() => applyColor(item.color)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
        <Input
          className={cn("flex-1 font-mono text-theme-xs", compact ? "h-8" : "h-9")}
          value={localValue}
          placeholder="#ffffff"
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value;
            setLocalValue(next);
            scheduleCommit(next);
          }}
          onBlur={(event) => {
            const normalized = normalizeHexColor(event.target.value);
            if (normalized) {
              setLocalValue(normalized);
              commitNow(normalized);
              return;
            }
            if (!event.target.value.trim()) {
              setLocalValue("");
              commitNow("");
            }
          }}
        />
        {allowClear ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("shrink-0 px-2 text-theme-xs", compact ? "h-8" : "h-9")}
            onClick={() => {
              setLocalValue("");
              commitNow("");
            }}
          >
            清除
          </Button>
        ) : null}
      </div>
      {!compact ? (
        <p className="text-[10px] text-gray-400">点击左侧色块打开取色器，或直接输入 Hex</p>
      ) : null}
    </div>
  );
}
