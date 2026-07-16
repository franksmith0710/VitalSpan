import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColorField, type ColorSwatch } from "@/components/ui/color-field";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** 看板 chart-edit 窄栏（~216px）紧凑密度，对标 DataEase editor-light */
export const INSPECTOR_CTRL = "h-8 rounded-md text-theme-xs";
export const INSPECTOR_SELECT = cn(INSPECTOR_CTRL, "w-full");
export const INSPECTOR_LABEL = "text-[11px] font-medium text-gray-500 dark:text-gray-400";
export const INSPECTOR_HINT = "text-[10px] leading-relaxed text-gray-400 dark:text-gray-500";
export const INSPECTOR_SECTION_GAP = "space-y-2.5";
export const INSPECTOR_SWITCH_ROW = "flex items-center justify-between gap-2 py-0.5";
export const INSPECTOR_NESTED_CARD =
  "space-y-2 rounded-md border border-gray-200 bg-gray-50/70 p-2 dark:border-gray-800 dark:bg-white/[0.03]";

export function InspectorSubtleEmpty({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-md border border-dashed border-gray-200 bg-gray-50/50 px-2 py-2 text-center text-[10px] leading-relaxed text-gray-400 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-500",
        className,
      )}
    >
      {message}
    </p>
  );
}

export function InspectorFieldRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <Label className={INSPECTOR_LABEL}>{label}</Label>
      {children}
      {hint ? <p className={INSPECTOR_HINT}>{hint}</p> : null}
    </div>
  );
}

export function InspectorSwitchRow({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  hint,
  "aria-label": ariaLabel,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
  "aria-label"?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className={INSPECTOR_SWITCH_ROW}>
        <Label
          className={cn(
            INSPECTOR_LABEL,
            "font-normal",
            disabled ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300",
          )}
        >
          {label}
        </Label>
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={ariaLabel ?? label}
          className="scale-90"
        />
      </div>
      {hint ? <p className={INSPECTOR_HINT}>{hint}</p> : null}
    </div>
  );
}

/** 216px 图表样式栏：功能种类折叠（无灰底条），标题行右侧可放 Switch */
export function ChartInspectorSection({
  title,
  children,
  action,
  defaultOpen = false,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group border-b border-gray-100 dark:border-white/[0.06]", className)}
    >
      <div className="flex items-center gap-1 py-1">
        <CollapsibleTrigger
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-1 text-left",
            "text-[11px] font-semibold text-gray-800 dark:text-white/90",
            "transition-colors hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
            "dark:hover:bg-white/[0.04]",
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
      {children ? (
        <CollapsibleContent className="space-y-0 pb-2">{children}</CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}

/** @deprecated 使用 ChartInspectorSection */
export const ChartInspectorFlatSection = ChartInspectorSection;

/** 432px 配置栏：标签左 + 控件右，避免色块输入通栏拉长 */
export function InspectorInlineColorRow({
  label,
  value,
  onChange,
  swatches,
  allowClear = true,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  swatches?: readonly ColorSwatch[] | readonly string[];
  allowClear?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-gray-100 py-2 last:border-b-0 dark:border-white/[0.06]",
        className,
      )}
    >
      <Label className={cn(INSPECTOR_LABEL, "shrink-0")}>{label}</Label>
      <ColorField
        variant="swatch"
        showLabel={false}
        allowClear={allowClear}
        swatches={swatches}
        value={value}
        buttonAriaLabel={`${label}取色器`}
        onChange={onChange}
      />
    </div>
  );
}
