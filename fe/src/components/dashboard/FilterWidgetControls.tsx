import type { CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FilterControlType, FilterOption } from "./layoutUtils";

export type FilterControlProps = {
  id: string;
  label: string;
  controlType: FilterControlType;
  value: string;
  options?: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  inputStyle?: CSSProperties;
};

function splitMulti(value: string): string[] {
  if (!value.trim()) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinMulti(values: string[]): string {
  return values.join(",");
}

export function FilterControl({
  id,
  label,
  controlType,
  value,
  options = [],
  onChange,
  className,
  disabled,
  inputStyle,
}: FilterControlProps) {
  const emptyHint = options.length === 0;

  if (controlType === "select") {
    return (
      <div className={cn("min-w-[140px] flex-1 space-y-1.5 sm:max-w-xs", className)}>
        <Label htmlFor={id}>{label}</Label>
        {emptyHint ? (
          <>
            <Select disabled value="">
              <SelectTrigger id={id} className="h-10" style={inputStyle} aria-label={label}>
                <SelectValue placeholder="暂无选项" />
              </SelectTrigger>
            </Select>
            <p className="text-theme-xs text-gray-400">暂无枚举选项，请配置 options 或改用文本</p>
          </>
        ) : (
          <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger id={id} className="h-10" style={inputStyle} aria-label={label}>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  if (controlType === "date") {
    return (
      <div className={cn("min-w-[140px] flex-1 space-y-1.5 sm:max-w-xs", className)}>
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="date"
          className="h-10"
          style={inputStyle}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (controlType === "multiselect") {
    const selected = new Set(splitMulti(value));
    return (
      <div className={cn("min-w-[160px] flex-1 space-y-1.5 sm:max-w-sm", className)}>
        <Label>{label}</Label>
        {emptyHint ? (
          <p className="text-theme-xs text-gray-400">暂无枚举选项</p>
        ) : (
          <div
            role="group"
            aria-label={label}
            className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900"
          >
            {options.map((opt) => {
              const checked = selected.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 text-theme-sm text-gray-700 dark:text-gray-300"
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(next) => {
                      const set = new Set(selected);
                      if (next) set.add(opt.value);
                      else set.delete(opt.value);
                      onChange(joinMulti([...set]));
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("min-w-[140px] flex-1 space-y-1.5 sm:max-w-xs", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="h-10"
        style={inputStyle}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
