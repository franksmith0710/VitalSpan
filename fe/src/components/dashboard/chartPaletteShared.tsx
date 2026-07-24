import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColorSwatch } from "@/components/ui/color-field";
import { ColorPickerPanel } from "@/components/ui/color-picker-panel";
import { ColorSwatchChip } from "@/components/ui/color-swatch-chip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeHexColor } from "@/components/ui/color-utils";
import { Switch } from "@/components/ui/switch";
import { INSPECTOR_SWITCH_SIZE } from "./inspectorCompact";
import { resolveChartColors } from "@/lib/chartPalette";
import { CHART_FONT_SIZE_OPTIONS, resolveChartFontSizeOptions } from "@/lib/chartFontSizes";
import { HintTooltip, TruncateHint } from "@/components/ui/hint-tooltip";
import { cn } from "@/lib/utils";
import { DE_SELECT } from "./dashboardInspectorUi";
import { INSPECTOR_LABEL, INSPECTOR_SELECT, useInspectorSectionOpen } from "./inspectorCompact";

export const PALETTE_STRIP_SWATCH_COUNT = 8;
/** 下拉项 / 触发器色带统一宽度，避免首项「跟随看板」与预设行错位 */
export const PALETTE_SWATCH_STRIP_WIDTH = "5.5rem";

/** 配色方案色带预览（对标 DataEase 下拉条） */
export function ChartPaletteSwatchStrip({
  colors,
  inherit,
  inheritPreviewColors,
  className,
  count = PALETTE_STRIP_SWATCH_COUNT,
}: {
  colors: readonly string[];
  inherit?: boolean;
  /** 继承仪表板时展示的色带（与看板配置一致） */
  inheritPreviewColors?: readonly string[];
  className?: string;
  count?: number;
}) {
  const palette = inherit
    ? (inheritPreviewColors?.length
        ? inheritPreviewColors
        : resolveChartColors("default")
      ).slice(0, count)
    : colors;
  return (
    <div
      className={cn(
        "flex h-4 w-full min-w-0 items-stretch overflow-hidden rounded-sm",
        "ring-1 ring-inset ring-black/[0.06] dark:ring-white/10",
        inherit && !inheritPreviewColors?.length && "opacity-60",
        className,
      )}
      aria-hidden
    >
      {palette.slice(0, count).map((color, index) => (
        <span
          key={`${inherit ? "inherit" : color}-${index}`}
          className="min-w-0 flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

/** 自定义配色栅格：对标 DE color-item（20×20 外框 + 14×14 色块） */
export function ChartPaletteColorSwatch({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open || timerRef.current != null) return;
    setLocal(value);
  }, [value, open]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const commit = (next: string) => {
    const normalized = normalizeHexColor(next) ?? next;
    setLocal(normalized);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onChange(normalized);
    }, 120);
  };

  const display = local || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            "size-5 shrink-0 rounded-[3px] border border-transparent p-0.5",
            "transition-colors hover:border-brand-500/60",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
            open && "border-brand-500",
          )}
        >
          <span
            className="block size-3.5 rounded-[1px]"
            style={{ backgroundColor: display }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" sideOffset={4}>
        <ColorPickerPanel value={display} onChange={commit} />
      </PopoverContent>
    </Popover>
  );
}

/** 系列色行：色块 + 名称（对标 DE color-list-item） */
export function ChartPaletteSeriesColorRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <ChartPaletteColorSwatch value={value} aria-label={`${name} 系列色`} onChange={onChange} />
      <TruncateHint title={name} className="min-w-0 flex-1 text-[12px] text-gray-600 dark:text-gray-300">
        {name}
      </TruncateHint>
    </div>
  );
}

/** @deprecated 使用 CHART_FONT_SIZE_OPTIONS（`@/lib/chartFontSizes`） */
export const CHART_PALETTE_FONT_SIZES = CHART_FONT_SIZE_OPTIONS;

type ChartPaletteNestedSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
  compact?: boolean;
  /** 与标题行 Switch 同步：开 → 展开，关 → 收起 */
  enabled?: boolean;
};

/** DataEase attr-style 内嵌折叠组（图表标签 / 提示 / 表格配色） */
export function ChartPaletteNestedSection({
  title,
  children,
  defaultOpen = false,
  action,
  compact = false,
  enabled,
}: ChartPaletteNestedSectionProps) {
  const [open, setOpen] = useInspectorSectionOpen(defaultOpen, enabled);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group border-b border-gray-100 dark:border-white/[0.06]"
    >
      <div className="flex items-center gap-1 py-1.5">
        <CollapsibleTrigger
          className={cn(
            "flex min-w-0 flex-1 items-center gap-0.5 rounded-md text-left",
            compact
              ? "py-1 pl-0 pr-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-300"
              : "py-1 pl-0 pr-1 text-theme-xs font-medium text-gray-700 dark:text-gray-300",
            "hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:hover:bg-white/[0.04]",
          )}
        >
          <ChevronRight
            className="size-3 shrink-0 text-gray-400 transition-transform group-data-[state=open]:rotate-90"
            aria-hidden
          />
          <span className="min-w-0 truncate">{title}</span>
        </CollapsibleTrigger>
        {action ? (
          <div
            className="flex shrink-0 items-center pr-0.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {action}
          </div>
        ) : null}
      </div>
      <CollapsibleContent className="space-y-0 pb-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function ChartPaletteSectionSwitch({
  checked,
  onCheckedChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      size={INSPECTOR_SWITCH_SIZE}
    />
  );
}

type ChartPaletteFontSizeSelectProps = {
  value?: number;
  fallback?: number;
  options?: readonly number[];
  onChange: (fontSize: number) => void;
  density?: "narrow" | "wide";
  className?: string;
  showLabel?: boolean;
  /** 左侧标签文案，默认「字体大小」 */
  label?: string;
};

export function ChartPaletteFontSizeSelect({
  value,
  fallback = 12,
  options = CHART_FONT_SIZE_OPTIONS,
  onChange,
  density = "wide",
  className,
  showLabel = true,
  label = "字体大小",
}: ChartPaletteFontSizeSelectProps) {
  const resolved = value ?? fallback;
  const optionList = resolveChartFontSizeOptions(value, fallback, options);

  return (
    <div
      className={cn(
        showLabel &&
          "flex items-center justify-between gap-2 border-b border-gray-100 py-2 last:border-b-0 dark:border-white/[0.06]",
        !showLabel && "py-0",
        className,
      )}
    >
      {showLabel ? (
        <span className={cn(INSPECTOR_LABEL, "shrink-0 whitespace-nowrap")}>{label}</span>
      ) : null}
      <Select value={String(resolved)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger
          className={cn(density === "narrow" ? INSPECTOR_SELECT : DE_SELECT, "h-8 w-[5rem] shrink-0")}
          aria-label="字体大小"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {optionList.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type ChartTableColorGridCellProps = {
  label: string;
  value: string;
  swatches?: readonly ColorSwatch[] | readonly string[];
  onChange: (value: string | undefined) => void;
};

function normalizeTableColorSwatches(
  swatches: readonly ColorSwatch[] | readonly string[] | undefined,
): ColorSwatch[] {
  if (!swatches || swatches.length === 0) return [];
  if (typeof swatches[0] === "string") {
    return (swatches as readonly string[]).map((color) => ({ color, label: color }));
  }
  return swatches as ColorSwatch[];
}

/** DE 表格配色：紧凑色块 + Hex/默认 + 标签，两列栅格单元 */
export function ChartTableColorGridCell({
  label,
  value,
  swatches,
  onChange,
}: ChartTableColorGridCellProps) {
  const items = normalizeTableColorSwatches(swatches);
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open || timerRef.current != null) return;
    setLocalValue(value);
  }, [value, open]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const flushCommit = (raw: string) => {
    const trimmed = raw.trim();
    const resolved = trimmed ? normalizeHexColor(trimmed) ?? undefined : undefined;
    if (trimmed && !resolved) return;
    onChange(resolved);
  };

  const scheduleCommit = (raw: string) => {
    const trimmed = raw.trim();
    const resolved = trimmed ? normalizeHexColor(trimmed) ?? undefined : undefined;
    if (trimmed && !resolved) return;
    setLocalValue(trimmed ? resolved ?? "" : "");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onChange(resolved);
    }, 120);
  };

  const displayHex = normalizeHexColor(localValue) ?? localValue;
  const swatchTitle = displayHex
    ? `${label} · ${displayHex.toUpperCase()}`
    : `${label} · 默认`;

  return (
    <div className="min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <HintTooltip label={swatchTitle}>
            <button
              type="button"
              aria-label={`${label}取色器`}
              aria-expanded={open}
            className={cn(
              "flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md border bg-white px-1.5 text-left shadow-theme-xs transition-[border-color,box-shadow] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:bg-white/[0.03]",
              open
                ? "border-brand-300 ring-2 ring-brand-500/20 dark:border-brand-500/50"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
            )}
          >
            <ColorSwatchChip color={displayHex || undefined} size="sm" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[10px] leading-none",
                displayHex
                  ? "font-mono uppercase tracking-wide text-gray-700 dark:text-gray-200"
                  : "text-gray-400 dark:text-gray-500",
              )}
            >
              {displayHex ? displayHex.toUpperCase() : "默认"}
            </span>
            <ChevronDown
              className={cn(
                "size-3 shrink-0 text-gray-400 transition-transform dark:text-gray-500",
                open && "rotate-180 text-brand-500 dark:text-brand-400",
              )}
              aria-hidden
            />
          </button>
          </HintTooltip>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="w-[228px] max-h-[min(70vh,24rem)] overflow-y-auto overscroll-contain p-2.5"
        >
          <p className="mb-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <ColorPickerPanel value={localValue} onChange={scheduleCommit} />
          {items.length > 0 ? (
            <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800">
              <p className="mb-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">推荐</p>
              <div className="grid grid-cols-6 gap-1" role="listbox" aria-label={`${label}推荐色`}>
                {items.map((item) => {
                  const selected = normalizeHexColor(localValue) === normalizeHexColor(item.color);
                  return (
                    <HintTooltip key={item.color} label={item.label}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-label={item.label}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md transition-colors",
                        "hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
                        "dark:hover:bg-white/5",
                        selected &&
                          "bg-brand-50/80 ring-1 ring-inset ring-brand-500/50 dark:bg-brand-500/10",
                      )}
                      onClick={() => scheduleCommit(item.color)}
                    >
                        <ColorSwatchChip color={item.color} size="sm" selected={selected} />
                      </button>
                    </HintTooltip>
                  );
                })}
              </div>
            </div>
          ) : null}
          {displayHex ? (
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              onClick={() => {
                setLocalValue("");
                flushCommit("");
              }}
            >
              清除颜色
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
      <p className="mt-0.5 truncate text-[10px] leading-tight text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}
