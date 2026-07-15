import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPickerPanel } from "@/components/ui/color-picker-panel";
import { ColorSwatchChip } from "@/components/ui/color-swatch-chip";
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
  /** field：完整输入；swatch：仅色块按钮（配置栏与下拉并排） */
  variant?: "field" | "swatch";
  className?: string;
  /** 取色器/输入框连续变更时防抖提交，减轻画布等大组件重渲染 */
  liveCommitMs?: number;
  /** 有推荐色板时默认展开 */
  swatchesDefaultOpen?: boolean;
};

const DEFAULT_LIVE_COMMIT_MS = 120;

const FIELD_SHELL =
  "flex w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-1.5 shadow-theme-xs transition-[border-color,box-shadow] focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:focus-within:border-brand-500/40 dark:focus-within:ring-brand-500/15";

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
  return normalizeHexColor(trimmed) ?? undefined;
}

export function ColorField({
  value,
  onChange,
  swatches = [],
  label,
  allowClear = true,
  compact = false,
  variant = "field",
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

  // 取色器打开或防抖未 flush 时，本地 draft 优先，避免父级回写导致拖拽跳色
  useEffect(() => {
    if (open) return;
    if (timerRef.current != null) return;
    setLocalValue(value);
  }, [value, open]);

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
    const resolved = resolveCommitValue(next);
    if (resolved === undefined) return;
    pendingRef.current = resolved;
    flushCommit();
  };

  const displayHex = normalizeHexColor(localValue) ?? localValue;
  const pickerLabel = label ? `${label}取色器` : "取色器";
  const chipSize = compact || variant === "swatch" ? "sm" : "md";
  const popoverAlign = variant === "swatch" ? "start" : compact ? "end" : "start";
  const popoverSide = variant === "swatch" ? "bottom" : compact ? "left" : "bottom";

  const popoverBody = (
    <PopoverContent
      align={popoverAlign}
      side={popoverSide}
      sideOffset={6}
      collisionPadding={12}
      className="w-[228px] max-h-[min(70vh,24rem)] overflow-y-auto overscroll-contain p-2.5"
    >
      <ColorPickerPanel value={localValue} onChange={applyColor} />
      {items.length > 0 ? (
        <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800">
          <p className="mb-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">推荐</p>
          <div
            className="grid grid-cols-6 gap-1"
            role="listbox"
            aria-label={label ? `${label}推荐色` : "推荐色"}
          >
            {items.map((item) => {
              const selected =
                normalizeHexColor(localValue) === normalizeHexColor(item.color);
              return (
                <button
                  key={item.color}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md transition-colors",
                    "hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
                    "dark:hover:bg-white/5",
                    selected &&
                      "bg-brand-50/80 ring-1 ring-inset ring-brand-500/50 dark:bg-brand-500/10",
                  )}
                  onClick={() => applyColor(item.color)}
                >
                  <ColorSwatchChip color={item.color} size="sm" selected={selected} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {variant === "swatch" && allowClear && displayHex ? (
        <button
          type="button"
          className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          onClick={() => {
            setLocalValue("");
            commitNow("");
          }}
        >
          清除颜色
        </button>
      ) : null}
    </PopoverContent>
  );

  if (variant === "swatch") {
    return (
      <div className={cn("shrink-0", className)}>
        {label ? (
          <Label className="sr-only text-theme-xs text-gray-600 dark:text-gray-400">{label}</Label>
        ) : null}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={pickerLabel}
              aria-expanded={open}
              title={pickerLabel}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-theme-xs transition-colors",
                "hover:border-gray-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
                "dark:border-gray-700 dark:bg-white/[0.03] dark:hover:border-gray-600",
                open && "border-brand-300 ring-2 ring-brand-500/20 dark:border-brand-500/50",
              )}
            >
              <ColorSwatchChip color={displayHex || undefined} size={chipSize} />
            </button>
          </PopoverTrigger>
          {popoverBody}
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn(compact ? "space-y-0" : "space-y-2", className)}>
      {label ? (
        <Label className="text-theme-xs text-gray-600 dark:text-gray-400">{label}</Label>
      ) : null}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <div className={cn(FIELD_SHELL, compact ? "h-8" : "h-9")}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={pickerLabel}
              aria-expanded={open}
              title="打开取色器"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md py-0.5 pl-0.5 pr-1 transition-colors",
                "hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30",
                "dark:hover:bg-white/5",
                open && "bg-gray-50 ring-1 ring-inset ring-brand-200 dark:bg-white/5 dark:ring-brand-500/30",
              )}
            >
              <ColorSwatchChip color={displayHex || undefined} size={chipSize} />
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-gray-400 transition-transform dark:text-gray-500",
                  open && "rotate-180 text-brand-500 dark:text-brand-400",
                )}
                aria-hidden
              />
            </button>
          </PopoverTrigger>
          <input
            className="min-w-0 flex-1 border-0 bg-transparent px-0.5 font-mono text-[11px] uppercase tracking-wide text-gray-700 placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none dark:text-gray-200 dark:placeholder:text-gray-500"
            value={localValue}
            placeholder="#ffffff"
            spellCheck={false}
            aria-label={label ? `${label} Hex` : "颜色 Hex"}
            onChange={(event) => {
              const next = event.target.value;
              setLocalValue(next);
              const resolved = resolveCommitValue(next);
              if (open) {
                if (resolved !== undefined) commitNow(resolved);
                return;
              }
              if (resolved !== undefined) scheduleCommit(resolved);
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
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30 dark:hover:bg-white/5 dark:hover:text-gray-200"
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
        {popoverBody}
      </Popover>
    </div>
  );
}
