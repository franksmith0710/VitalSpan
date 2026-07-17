import type { CSSProperties, ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { INSPECTOR_SWITCH_SIZE } from "./inspectorCompact";

export type DeSegmentOption = {
  value: string | boolean;
  label: ReactNode;
  /** 图标项必填；纯文案可省略 */
  ariaLabel?: string;
  disabled?: boolean;
  style?: CSSProperties;
};

/** 看板配置栏（~432px）TailAdmin 密度 */
export const DE_CTRL =
  "h-9 w-full rounded-lg border-gray-200 bg-white text-theme-xs shadow-theme-xs dark:border-gray-700 dark:bg-white/[0.03]";

export const DE_SELECT = cn(DE_CTRL, "px-3");

export const DE_INPUT = cn(DE_CTRL, "px-3");

export function DeAttrForm({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

/** 字段块：标题 + 全宽控件（432px 栏首选） */
export function DeAttrField({
  label,
  children,
  hint,
  className,
  compact,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-gray-100 dark:border-white/[0.06]",
        compact ? "py-2.5" : "py-3",
        className,
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {hint ? <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** 嵌套子字段（如间隙大小）：扁平分隔，不用圆角灰底块 */
export function DeAttrSubField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-b border-gray-100 py-2 last:border-b-0 dark:border-white/[0.06]",
        className,
      )}
    >
      <p className="mb-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
      {children}
    </div>
  );
}

/** TailAdmin 分段控件：灰底轨道 + 白底选中项 */
export function DeSegmentGroup({
  value,
  options,
  onChange,
  columns,
  className,
  sizing = "fill",
}: {
  value: string | boolean;
  options: ReadonlyArray<DeSegmentOption>;
  onChange: (value: string | boolean) => void;
  columns?: number;
  className?: string;
  /** fill：撑满栏宽；fit：按文案收窄，适合 432px 看板配置 */
  sizing?: "fill" | "fit";
}) {
  const cols = columns ?? Math.min(options.length, 4);
  const fitCell =
    cols >= 4 ? "minmax(3.75rem, 5.25rem)" : "minmax(4.25rem, 6.25rem)";

  return (
    <div
      className={cn(
        "grid gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-white/[0.06]",
        sizing === "fit" && "inline-grid w-fit max-w-full",
        className,
      )}
      style={{
        gridTemplateColumns:
          sizing === "fit"
            ? `repeat(${cols}, ${fitCell})`
            : `repeat(${cols}, minmax(0, 1fr))`,
      }}
      role="group"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        const isTextLabel = typeof opt.label === "string";
        const ariaLabel = opt.ariaLabel ?? (isTextLabel ? String(opt.label) : undefined);
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={selected}
            aria-label={ariaLabel}
            title={ariaLabel}
            disabled={opt.disabled}
            style={opt.style}
            onClick={() => {
              if (!opt.disabled) onChange(opt.value);
            }}
            className={cn(
              "flex min-h-8 items-center justify-center rounded-md py-1.5 text-center text-[11px] font-medium leading-tight transition-all",
              isTextLabel ? "px-2" : "px-1.5",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-1",
              selected
                ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-300"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
              opt.disabled && "cursor-not-allowed opacity-40",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** 开关行：左文案 + 右 Switch；可选 description 对标 DataEase 辅助项说明 */
export function DeAttrToggleRow({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "border-b border-gray-100 py-2.5 last:border-b-0 dark:border-white/[0.06]",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 text-theme-xs text-gray-600 dark:text-gray-300">{label}</span>
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={label}
          size={INSPECTOR_SWITCH_SIZE}
          className="shrink-0"
        />
      </div>
      {description ? (
        <p className="mt-1 text-[10px] leading-snug text-gray-400 dark:text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}

export function DeAttrToggleSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 py-1 dark:border-white/[0.06]">
      {title ? (
        <p className="pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** @deprecated 使用 DeAttrField */
export function DeAttrRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  nested?: boolean;
}) {
  return (
    <DeAttrField label={label} className={className}>
      {children}
    </DeAttrField>
  );
}

/** @deprecated 使用 DeSegmentGroup */
export function DeAttrRadioGroup({
  value,
  options,
  onChange,
  className,
}: {
  value: string | boolean;
  options: ReadonlyArray<{ value: string | boolean; label: ReactNode; ariaLabel?: string; disabled?: boolean }>;
  onChange: (value: string | boolean) => void;
  className?: string;
}) {
  return (
    <DeSegmentGroup value={value} options={options} onChange={onChange} className={className} />
  );
}

/** @deprecated 使用 DeAttrToggleRow */
export const DeAttrSwitchRow = DeAttrToggleRow;

export const CONFIG_CTRL = DE_INPUT;
