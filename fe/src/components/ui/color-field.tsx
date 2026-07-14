import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
};

const DEFAULT_LIVE_COMMIT_MS = 120;

export function normalizeHexColor(input: string): string | null {
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function pickerValue(hex: string): string {
  return normalizeHexColor(hex) ?? "#ffffff";
}

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
}: ColorFieldProps) {
  const items = normalizeSwatches(swatches);
  const [localValue, setLocalValue] = useState(value);
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

  const displayHex = normalizeHexColor(localValue) ?? localValue;

  return (
    <div className={cn(compact ? "space-y-1.5" : "space-y-2", className)}>
      {label ? (
        <Label className="text-theme-xs text-gray-600 dark:text-gray-400">{label}</Label>
      ) : null}
      <div className="flex items-center gap-1.5">
        <label
          className={cn(
            "relative shrink-0 cursor-pointer overflow-hidden rounded-md border border-gray-200 dark:border-gray-700",
            compact ? "size-8" : "size-9",
          )}
        >
          <span
            className="absolute inset-0"
            style={{ background: displayHex || "#ffffff" }}
            aria-hidden
          />
          <input
            type="color"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            value={pickerValue(localValue)}
            aria-label={label ? `${label}取色器` : "取色器"}
            onInput={(event) => {
              const next = event.currentTarget.value;
              setLocalValue(next);
              scheduleCommit(next);
            }}
            onBlur={() => {
              if (pendingRef.current !== undefined) flushCommit();
            }}
          />
        </label>
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
      {items.length > 0 && !compact ? (
        <div className="space-y-1.5">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">推荐颜色</p>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <button
                key={item.color}
                type="button"
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "size-7 rounded-md border transition-shadow",
                  normalizeHexColor(localValue) === normalizeHexColor(item.color)
                    ? "ring-2 ring-brand-500 ring-offset-1"
                    : "border-gray-200 hover:scale-105 dark:border-gray-700",
                )}
                style={{ background: item.color }}
                onClick={() => {
                  setLocalValue(item.color);
                  commitNow(item.color);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
