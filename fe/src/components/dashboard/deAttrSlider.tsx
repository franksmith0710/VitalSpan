import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function sliderPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 432px 看板配置栏滑块宽度 */
export const DE_SLIDER_WIDTH_WIDE = "w-[10.5rem]";
/** 216px 图表检查栏滑块宽度 */
export const DE_SLIDER_WIDTH_NARROW = "w-[7.25rem]";
/** 216px 行内字段（标签+滑块+数值）定宽滑块 */
export const DE_SLIDER_WIDTH_CHART_INLINE = "w-[5.5rem]";

const SLIDER_SHELL = "relative flex h-7 items-center";
const SLIDER_TRACK =
  "pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10";
const SLIDER_THUMB =
  "pointer-events-none absolute top-1/2 z-[1] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-white shadow-theme-xs will-change-[left] dark:border-brand-400 dark:bg-gray-900";

const DE_ATTR_FIELD_SHELL =
  "border-b border-gray-100 dark:border-white/[0.06]";

export type DeProgressSliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  ariaValuetext?: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  /** 拖拽过程中每帧预览（用于标签即时刷新，不触发重渲染链） */
  onPreview?: (value: number | null) => void;
};

/**
 * DataEase el-slider--small 对标：细轨道 + 品牌色进度 + 圆形滑块
 * 拖拽时仅更新本地 draft；松手后一次性提交，避免拖动卡顿。
 */
export function DeProgressSlider({
  value,
  min,
  max,
  step = 1,
  ariaLabel,
  ariaValuetext,
  className,
  disabled = false,
  onChange,
  onPreview,
}: DeProgressSliderProps) {
  const clamped = clampValue(value, min, max);
  const [draft, setDraft] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const startValueRef = useRef(clamped);
  const draftRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const onPreviewRef = useRef(onPreview);

  onChangeRef.current = onChange;
  onPreviewRef.current = onPreview;

  const shown = draft ?? clamped;
  const percent = sliderPercent(shown, min, max);
  const valueText = ariaValuetext ?? String(shown);

  useEffect(() => {
    if (!draggingRef.current) {
      setDraft(null);
      draftRef.current = null;
    }
  }, [clamped]);

  const beginDrag = useCallback(() => {
    draggingRef.current = true;
    startValueRef.current = draftRef.current ?? clamped;
  }, [clamped]);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const final = draftRef.current ?? startValueRef.current;
    draftRef.current = null;
    setDraft(null);
    onPreviewRef.current?.(null);
    if (final !== startValueRef.current) {
      onChangeRef.current(final);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    draftRef.current = next;
    setDraft(next);
    onPreviewRef.current?.(next);
    if (!draggingRef.current) {
      onChangeRef.current(next);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    beginDrag();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag();
  };

  return (
    <div
      className={cn(SLIDER_SHELL, "max-w-full", disabled && "opacity-50", className)}
      data-testid="de-progress-slider"
    >
      <div className={SLIDER_TRACK} aria-hidden>
        <div
          className="h-full w-full origin-left rounded-full bg-brand-500 will-change-transform dark:bg-brand-400"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
      <div className={SLIDER_THUMB} style={{ left: `${percent}%` }} aria-hidden />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={valueText}
        className="absolute inset-0 z-20 m-0 h-full w-full cursor-pointer touch-none opacity-0 disabled:cursor-not-allowed"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onBlur={() => {
          if (draggingRef.current) endDrag();
        }}
        onChange={handleInput}
      />
    </div>
  );
}

type DeSliderInlineRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ariaLabel?: string;
  density?: "wide" | "narrow";
  /** field：DeAttr 表单标签；muted：grid 内次级标签；compact：2 列栅格短标签 */
  labelTone?: "field" | "muted" | "compact";
  disabled?: boolean;
  className?: string;
  onChange: (value: number) => void;
  onPreview?: (value: number | null) => void;
};

/** 单行：标签 · 滑块 · 数值（TailAdmin / DE 紧凑密度） */
function DeSliderInlineRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  ariaLabel,
  density = "wide",
  labelTone = "muted",
  disabled = false,
  className,
  onChange,
  onPreview,
}: DeSliderInlineRowProps) {
  const clamped = clampValue(value, min, max);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? clamped;
  const display = unit ? `${shown}${unit}` : String(shown);
  const sliderWidth =
    density === "narrow" && labelTone === "field"
      ? DE_SLIDER_WIDTH_CHART_INLINE
      : density === "narrow"
        ? DE_SLIDER_WIDTH_NARROW
        : DE_SLIDER_WIDTH_WIDE;
  const gridCols =
    density === "narrow" && labelTone === "field"
      ? "grid-cols-[minmax(0,1fr)_5.5rem_2rem]"
      : labelTone === "field"
        ? "grid-cols-[4.75rem_minmax(0,10.5rem)_2.5rem]"
        : labelTone === "compact"
          ? "grid-cols-[1.75rem_minmax(0,1fr)_2.5rem]"
          : "grid-cols-[minmax(0,1fr)_minmax(0,10.5rem)_2.5rem]";

  return (
    <div className={cn("grid min-w-0 items-center gap-x-2.5", gridCols, className)}>
      <span
        className={cn(
          "min-w-0 truncate text-theme-xs",
          labelTone === "field"
            ? "font-medium text-gray-700 dark:text-gray-300"
            : labelTone === "compact"
              ? "text-center text-gray-500 dark:text-gray-400"
              : "text-gray-500 dark:text-gray-400",
        )}
      >
        {label}
      </span>
      <DeProgressSlider
        className={cn(sliderWidth, "min-w-0 max-w-full justify-self-start")}
        value={clamped}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        ariaLabel={ariaLabel ?? label}
        ariaValuetext={display}
        onPreview={(value) => {
          setPreview(value);
          onPreview?.(value);
        }}
        onChange={onChange}
      />
      <span className="min-w-0 truncate text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
        {display}
      </span>
    </div>
  );
}

type DeSliderStackedRowProps = Omit<DeSliderInlineRowProps, "labelTone" | "density" | "className"> & {
  className?: string;
};

/** 窄列双行：顶行标签+数值，底行滑块（2 列 grid 单元格防重叠） */
function DeSliderStackedRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  ariaLabel,
  className,
  onChange,
}: DeSliderStackedRowProps) {
  const clamped = clampValue(value, min, max);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? clamped;
  const display = unit ? `${shown}${unit}` : String(shown);

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-theme-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{display}</span>
      </div>
      <DeProgressSlider
        className="w-full min-w-0"
        value={clamped}
        min={min}
        max={max}
        step={step}
        ariaLabel={ariaLabel ?? label}
        ariaValuetext={display}
        onPreview={setPreview}
        onChange={onChange}
      />
    </div>
  );
}

export type DeAttrSliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ariaLabel: string;
  className?: string;
  onChange: (value: number) => void;
};

/** DataEase 风格数值滑块（仅轨道 + 数值，无标签） */
export function DeAttrSlider({
  value,
  min,
  max,
  step = 1,
  unit = "",
  ariaLabel,
  className,
  onChange,
}: DeAttrSliderProps) {
  const clamped = clampValue(value, min, max);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? clamped;
  const display = unit ? `${shown}${unit}` : String(shown);

  return (
    <div className={cn("flex items-center justify-end gap-2.5", className)}>
      <DeProgressSlider
        className={DE_SLIDER_WIDTH_WIDE}
        value={clamped}
        min={min}
        max={max}
        step={step}
        ariaLabel={ariaLabel}
        ariaValuetext={display}
        onPreview={setPreview}
        onChange={onChange}
      />
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
        {display}
      </span>
    </div>
  );
}

export type ChartDeSliderFieldProps = {
  label: string;
  value: number | undefined;
  /** 未配置时的展示/滑块默认位置 */
  fallback?: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  /** stacked：标签+全宽滑块；inline：标签·定宽滑块·数值单行 */
  layout?: "stacked" | "inline";
  onPreviewChange?: (value: number | null) => void;
  onChange: (value: number) => void;
};

/** chart-edit 216px 栏：标签/数值一行 + 全宽或行内定宽滑块 */
export function ChartDeSliderField({
  label,
  value,
  fallback = 0,
  min,
  max,
  step = 1,
  unit = "",
  ariaLabel,
  className,
  disabled = false,
  layout = "stacked",
  onPreviewChange,
  onChange,
}: ChartDeSliderFieldProps) {
  const resolved = value ?? fallback;
  const clamped = clampValue(resolved, min, max);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? clamped;
  const display = unit ? `${shown}${unit}` : String(shown);

  if (layout === "inline") {
    return (
      <div
        className={cn(
          "border-b border-gray-100 py-2 last:border-b-0 dark:border-white/[0.06]",
          disabled && "opacity-60",
          className,
        )}
      >
        <DeSliderInlineRow
          label={label}
          value={clamped}
          min={min}
          max={max}
          step={step}
          unit={unit}
          ariaLabel={ariaLabel}
          density="narrow"
          labelTone="field"
          disabled={disabled}
          onChange={onChange}
          onPreview={onPreviewChange}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-b border-gray-100 py-2 last:border-b-0 dark:border-white/[0.06]",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{label}</p>
        <span className="shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
          {display}
        </span>
      </div>
      <DeProgressSlider
        className="w-full min-w-0"
        value={clamped}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        ariaLabel={ariaLabel ?? label}
        ariaValuetext={display}
        onPreview={(value) => {
          setPreview(value);
          onPreviewChange?.(value);
        }}
        onChange={onChange}
      />
    </div>
  );
}

export type InspectorSliderFieldProps = Omit<ChartDeSliderFieldProps, "className"> & {
  hint?: string;
  className?: string;
};

/** 216px 图表右栏：标签+数值顶行，滑块独占下一行全宽 */
export function InspectorSliderField({
  label,
  hint,
  className,
  ...slider
}: InspectorSliderFieldProps) {
  return (
    <div className="grid gap-1">
      <ChartDeSliderField label={label} className={className} {...slider} />
      {hint ? (
        <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export type DeAttrSliderFieldProps = {
  label: string;
  /** 字段下方静态说明（数值已在行尾展示） */
  hint?: string;
  value: number | undefined;
  fallback?: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  compact?: boolean;
  density?: "wide" | "narrow";
  labelTone?: DeSliderInlineRowProps["labelTone"];
  ariaLabel?: string;
  className?: string;
  onChange: (value: number) => void;
};

/** 432px 看板配置栏：单行滑块字段（对标 DE attr-style） */
export function DeAttrSliderField({
  label,
  hint,
  value,
  fallback = 0,
  min,
  max,
  step = 1,
  unit = "",
  compact,
  density = "wide",
  labelTone = "field",
  ariaLabel,
  className,
  onChange,
}: DeAttrSliderFieldProps) {
  const resolved = value ?? fallback;

  return (
    <div
      className={cn(
        DE_ATTR_FIELD_SHELL,
        compact ? "py-2" : "py-2.5",
        className,
      )}
    >
      {density === "narrow" ? (
        <DeSliderStackedRow
          label={label}
          value={resolved}
          min={min}
          max={max}
          step={step}
          unit={unit}
          ariaLabel={ariaLabel}
          onChange={onChange}
        />
      ) : (
        <DeSliderInlineRow
          label={label}
          value={resolved}
          min={min}
          max={max}
          step={step}
          unit={unit}
          ariaLabel={ariaLabel}
          density={density}
          labelTone={labelTone}
          onChange={onChange}
        />
      )}
      {hint ? (
        <p className="mt-1.5 text-[10px] leading-snug text-gray-400 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export type DashboardConfigSliderProps = Omit<DeAttrSliderFieldProps, "hint" | "compact"> & {
  /** 窄容器（如 Popover）内使用更短滑块 */
  compact?: boolean;
};

/** 看板配置栏滑块：单行标签 + 固定宽度轨道（对标 DE attr-style，禁止通栏大长线） */
export function DashboardConfigSlider({
  label,
  value,
  fallback = 0,
  min,
  max,
  step = 1,
  unit = "",
  ariaLabel,
  className,
  compact,
  onChange,
}: DashboardConfigSliderProps) {
  return (
    <DeAttrSliderField
      label={label}
      value={value}
      fallback={fallback}
      min={min}
      max={max}
      step={step}
      unit={unit}
      ariaLabel={ariaLabel}
      density={compact ? "narrow" : "wide"}
      className={cn("border-b-0", compact ? "py-0" : undefined, className)}
      compact={compact}
      onChange={onChange}
    />
  );
}

/** 2 列 grid 单元：双行布局，避免窄列内标签/滑块/数值挤叠 */
export function DashboardConfigGridSlider({
  label,
  value,
  fallback = 0,
  min,
  max,
  step = 1,
  unit = "",
  ariaLabel,
  className,
  onChange,
}: Omit<DashboardConfigSliderProps, "compact">) {
  return (
    <div className={cn("min-w-0 py-1", className)}>
      <DeSliderStackedRow
        label={label}
        value={value ?? fallback}
        min={min}
        max={max}
        step={step}
        unit={unit}
        ariaLabel={ariaLabel}
        onChange={onChange}
      />
    </div>
  );
}

/** 嵌套区块内带说明的滑块行（间隙/刷新自定义等） */
export function DeAttrSubSliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  ariaLabel,
  description,
  onChange,
  onPreview,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ariaLabel: string;
  description?: string;
  onChange: (value: number) => void;
  onPreview?: (value: number | null) => void;
}) {
  const clamped = clampValue(value, min, max);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? clamped;
  const display = unit ? `${shown}${unit}` : String(shown);

  const handlePreview = (next: number | null) => {
    setPreview(next);
    onPreview?.(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="grid min-w-0 grid-cols-[4.75rem_minmax(0,10.5rem)_2.5rem] items-center gap-x-2.5">
        <span className="min-w-0 truncate text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
        <DeProgressSlider
          className={cn(DE_SLIDER_WIDTH_WIDE, "min-w-0 max-w-full justify-self-start")}
          value={clamped}
          min={min}
          max={max}
          step={step}
          ariaLabel={ariaLabel}
          ariaValuetext={display}
          onPreview={handlePreview}
          onChange={onChange}
        />
        <span className="min-w-0 truncate text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
          {display}
        </span>
      </div>
      {description ? (
        <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}
