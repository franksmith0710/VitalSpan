import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColorField, type ColorSwatch } from "@/components/ui/color-field";
import { cn } from "@/lib/utils";

/** 看板 chart-edit 窄栏（~216px）紧凑密度，对标 DataEase editor-light */
export const INSPECTOR_CTRL = "h-8 rounded-md text-theme-xs";
export const INSPECTOR_SELECT = cn(INSPECTOR_CTRL, "w-full");
export const INSPECTOR_LABEL = "text-[11px] font-medium text-gray-500 dark:text-gray-400";
export const INSPECTOR_HINT = "text-[10px] leading-relaxed text-gray-400 dark:text-gray-500";
export const INSPECTOR_SECTION_GAP = "space-y-2.5";
export const INSPECTOR_SWITCH_ROW = "flex items-center justify-between gap-2 py-0.5";

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
  "aria-label": ariaLabel,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <div className={INSPECTOR_SWITCH_ROW}>
      <Label className={cn(INSPECTOR_LABEL, "font-normal text-gray-600 dark:text-gray-300")}>
        {label}
      </Label>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel ?? label}
        className="scale-90"
      />
    </div>
  );
}

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
        allowClear={allowClear}
        swatches={swatches}
        value={value}
        buttonAriaLabel={`${label}取色器`}
        onChange={onChange}
      />
    </div>
  );
}
