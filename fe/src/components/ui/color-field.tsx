import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
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
  const controlHeight = compact ? "h-8" : "h-9";
  const swatchWidth = compact ? "w-8" : "w-9";

  return (
    <div className={cn(compact ? "space-y-0" : "space-y-2", className)}>
      {label ? (
        <Label className="text-theme-xs text-gray-600 dark:text-gray-400">{label}</Label>
      ) : null}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <div
          className={cn(
            "flex w-full items-stretch overflow-hidden rounded-md border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900",
            controlHeight,
          )}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={pickerLabel}
              title="打开取色器"
              className={cn(
                "shrink-0 border-r border-gray-200 transition-opacity hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30 dark:border-gray-700",
                swatchWidth,
              )}
              style={{ background: displayHex || "#ffffff" }}
            />
          </PopoverTrigger>
          <input
            className="min-w-0 flex-1 border-0 bg-transparent px-2 font-mono text-theme-xs text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white/90 dark:placeholder:text-gray-500"
            value={localValue}
            placeholder="#ffffff"
            spellCheck={false}
            aria-label={label ? `${label} Hex` : "颜色 Hex"}
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
            <button
              type="button"
              className="flex w-7 shrink-0 items-center justify-center text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30 dark:hover:bg-white/5 dark:hover:text-gray-200"
              aria-label="清除颜色"
              onClick={() => {
                setLocalValue("");
                commitNow("");
              }}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <PopoverContent
          align={compact ? "end" : "start"}
          side={compact ? "left" : "bottom"}
          sideOffset={6}
          collisionPadding={12}
          className="w-[228px] p-2.5"
        >
          <ColorPickerPanel value={localValue} onChange={applyColor} />
          {items.length > 0 ? (
            <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800">
              <p className="mb-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">推荐</p>
              <div className="flex flex-wrap gap-1">
                {items.map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    className={cn(
                      "size-5 rounded border transition-transform hover:scale-105",
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
    </div>
  );
}
