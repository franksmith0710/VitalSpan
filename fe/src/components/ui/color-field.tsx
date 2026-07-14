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
  className?: string;
};

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

export function ColorField({
  value,
  onChange,
  swatches = [],
  label,
  allowClear = true,
  className,
}: ColorFieldProps) {
  const items = normalizeSwatches(swatches);
  const displayHex = normalizeHexColor(value) ?? value;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <Label className="text-theme-xs text-gray-600 dark:text-gray-400">{label}</Label>
      ) : null}
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <span
            className="absolute inset-0"
            style={{ background: displayHex || "#ffffff" }}
            aria-hidden
          />
          <input
            type="color"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            value={pickerValue(value)}
            aria-label={label ? `${label}取色器` : "取色器"}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <Input
          className="h-9 flex-1 font-mono text-theme-xs"
          value={value}
          placeholder="#ffffff"
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value;
            const normalized = normalizeHexColor(next);
            if (!next.trim()) {
              onChange(undefined);
              return;
            }
            onChange(normalized ?? next);
          }}
          onBlur={(event) => {
            const normalized = normalizeHexColor(event.target.value);
            if (normalized) onChange(normalized);
          }}
        />
        {allowClear ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 px-2 text-theme-xs"
            onClick={() => onChange(undefined)}
          >
            清除
          </Button>
        ) : null}
      </div>
      {items.length > 0 ? (
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
                  normalizeHexColor(value) === normalizeHexColor(item.color)
                    ? "ring-2 ring-brand-500 ring-offset-1"
                    : "border-gray-200 hover:scale-105 dark:border-gray-700",
                )}
                style={{ background: item.color }}
                onClick={() => onChange(item.color)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
