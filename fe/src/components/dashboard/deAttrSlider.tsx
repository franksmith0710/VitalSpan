import { cn } from "@/lib/utils";

function sliderPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

export type DeProgressSliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  ariaValuetext?: string;
  className?: string;
  onChange: (value: number) => void;
};

/**
 * DataEase el-slider--small 对标：4px 轨道 + 左侧品牌色进度 + 圆形滑块（24px 命中区）
 * 透明 range 叠在上方负责拖拽/键盘，视觉层独立绘制填充进度。
 */
export function DeProgressSlider({
  value,
  min,
  max,
  step = 1,
  ariaLabel,
  ariaValuetext,
  className,
  onChange,
}: DeProgressSliderProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const percent = sliderPercent(clamped, min, max);
  const valueText = ariaValuetext ?? String(clamped);

  return (
    <div className={cn("relative h-6 w-full", className)} data-testid="de-progress-slider">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-75 ease-out dark:bg-brand-400"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div
        className="pointer-events-none absolute top-1/2 z-[1] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-white shadow-theme-xs transition-[left] duration-75 ease-out dark:border-brand-400 dark:bg-gray-900"
        style={{ left: `${percent}%` }}
        aria-hidden
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => onChange(Number(e.target.value))}
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

/** DataEase 风格数值滑块（仅轨道，不含标签） */
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
  const clamped = Math.min(max, Math.max(min, value));
  const display = unit ? `${clamped}${unit}` : String(clamped);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-end">
        <span
          className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400"
          aria-hidden
        >
          {display}
        </span>
      </div>
      <DeProgressSlider
        value={clamped}
        min={min}
        max={max}
        step={step}
        ariaLabel={ariaLabel}
        ariaValuetext={display}
        onChange={onChange}
      />
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
  onChange: (value: number) => void;
};

/** chart-edit 216px 栏：标签 + 右侧数值 + 滑块（对标 DE attr-style） */
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
  onChange,
}: ChartDeSliderFieldProps) {
  const resolved = value ?? fallback;
  const clamped = Math.min(max, Math.max(min, resolved));
  const display = unit ? `${clamped}${unit}` : String(clamped);

  return (
    <div
      className={cn(
        "border-b border-gray-100 py-2 last:border-b-0 dark:border-white/[0.06]",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{label}</p>
        <span className="shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
          {display}
        </span>
      </div>
      <DeProgressSlider
        value={clamped}
        min={min}
        max={max}
        step={step}
        ariaLabel={ariaLabel ?? label}
        ariaValuetext={display}
        onChange={onChange}
      />
    </div>
  );
}

export type InspectorSliderFieldProps = Omit<ChartDeSliderFieldProps, "className"> & {
  hint?: string;
};

/** 与 InspectorFieldRow 同密度，滑块替代 number 输入 */
export function InspectorSliderField({
  label,
  hint,
  ...slider
}: InspectorSliderFieldProps) {
  return (
    <div className="grid gap-1">
      <ChartDeSliderField label={label} className="border-b-0 py-0" {...slider} />
      {hint ? (
        <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
